/**
 * Generates the script that intercepts XMLHttpRequest and fetch calls.
 *
 * @param fileNames - Names of inlined files to serve from embedded data
 * @param filesString - URI-encoded JSON string of file contents
 * @param proxyRoutes - Optional routes to proxy to parent window via postMessage
 * @param proxyTimeoutMs - Timeout in ms for proxy requests (default 30000)
 */
export function generateInterceptorScript(
  fileNames: string[],
  filesString: string,
  proxyRoutes?: { paths: string[] }[],
  proxyTimeoutMs?: number,
): string {
  const proxyConfig = proxyRoutes ? JSON.stringify(proxyRoutes) : "null";
  const timeoutVal = proxyTimeoutMs ?? 30000;

  return `<script>
  (function() {
    // Store file data for interception
    const __filesURI = "${filesString}";
    const __files = JSON.parse(decodeURIComponent(__filesURI));
    const __fileNames = ${JSON.stringify(fileNames)};
    const __proxyRoutes = ${proxyConfig} || (window.__magicSandboxProxyRoutes || null);

    // If proxy routes were provided via window variable, use them
    if (!__proxyRoutes && window.__magicSandboxProxyRoutes) {
      __proxyRoutes = window.__magicSandboxProxyRoutes;
    }

    // Helper: normalise a URL for matching
    function __normalizeUrl(url) {
      if (typeof url !== 'string') return '';
      let u = url;
      // Remove ./ prefix
      if (u.startsWith('./')) u = u.substring(2);
      // Fix blob:// protocol
      u = u.replace('blob://', 'http://');
      return u;
    }

    // Helper: check if a URL matches a proxy route path pattern
    function __matchesProxy(url, pattern) {
      if (url === pattern) return true;
      // Pattern like "/data/*" matches "/data/foo.csv"
      if (pattern.endsWith('/*') && url.startsWith(pattern.slice(0, -1))) return true;
      // Pattern like "*.csv" matches any CSV file
      if (pattern.startsWith('*') && url.endsWith(pattern.slice(1))) return true;
      return false;
    }

    // Helper: resolve a proxied request via postMessage to parent
    function __proxyFetch(url, normalizedUrl) {
      return new Promise(function(resolve, reject) {
        var requestId = Math.random().toString(36).slice(2);
        var timedOut = false;
        var timeoutId = setTimeout(function() {
          timedOut = true;
          window.removeEventListener('message', handler);
          resolve({
            ok: false, status: 504, statusText: 'Proxy Timeout',
            url: url,
            text: function() { return Promise.resolve(''); },
            json: function() { return Promise.reject(new Error('Proxy timeout')); },
            blob: function() { return Promise.reject(new Error('Proxy timeout')); },
            arrayBuffer: function() { return Promise.reject(new Error('Proxy timeout')); },
          });
        }, ${timeoutVal});
        function handler(event) {
          if (timedOut) return;
          if (event.data.type === 'proxyResponse' && event.data.requestId === requestId) {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handler);
            var d = event.data;
            if (d.error) {
              resolve({
                ok: false, status: 404, statusText: 'Not Found',
                url: url,
                text: function() { return Promise.resolve(''); },
                json: function() { return Promise.reject(new Error(d.error)); },
                blob: function() { return Promise.reject(new Error(d.error)); },
                arrayBuffer: function() { return Promise.reject(new Error(d.error)); },
              });
            } else {
              resolve({
                ok: true, status: 200, statusText: 'OK', url: url,
                text: function() { return Promise.resolve(d.content); },
                json: function() { return Promise.resolve(JSON.parse(d.content)); },
                blob: function() { return Promise.resolve(new Blob([d.content])); },
                arrayBuffer: function() {
                  var buf = new ArrayBuffer(d.content.length * 2);
                  var view = new Uint16Array(buf);
                  for (var i = 0; i < d.content.length; i++) view[i] = d.content.charCodeAt(i);
                  return Promise.resolve(buf);
                },
              });
            }
          }
        }
        window.addEventListener('message', handler);
        window.parent.postMessage({
          type: 'proxyRequest',
          requestId: requestId,
          path: normalizedUrl,
        }, '*');
      });
    }

    // Check if a URL matches any proxy route (returns the matching pattern or null)
    // Lazily re-checks window.__magicSandboxProxyRoutes at request time for runtime injection.
    function __findProxyRoute(url) {
      var routes = __proxyRoutes;
      if (!routes && window.__magicSandboxProxyRoutes) {
        routes = window.__magicSandboxProxyRoutes;
      }
      if (!routes) return null;
      for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        for (var j = 0; j < route.paths.length; j++) {
          if (__matchesProxy(url, route.paths[j])) {
            return route;
          }
        }
      }
      return null;
    }
  
    // Override XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      this.xhr = new OriginalXHR();
      return this;
    };
  
    // Override open method to intercept file requests
    window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      const normalizedUrl = __normalizeUrl(url);
      
      const proxyRoute = __findProxyRoute(normalizedUrl);
      if (proxyRoute) {
        this.proxyPath = normalizedUrl;
        this.readyState = 4;
        this.status = 200;
        return;
      }
      
      if (__fileNames.includes(normalizedUrl)) {
        this.file = normalizedUrl;
        this.responseText = __files[normalizedUrl];
        
        // Handle XML files
        if (normalizedUrl.endsWith(".xml")) {
          try {
            const parser = new DOMParser();
            this.responseXML = parser.parseFromString(this.responseText, "text/xml");
          } catch (e) {}
        }
        
        // Mark as completed
        this.readyState = 4;
        this.status = 200;
      } else {
        // Pass through to real XHR
        this.xhr.open(method, url, async, user, password);
      }
    };
  
    // Implement other XHR methods
    window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (this.file || this.proxyPath) return;
      return this.xhr.setRequestHeader(header, value);
    };
    
    window.XMLHttpRequest.prototype.abort = function() {
      return this.xhr.abort();
    };
    
    window.XMLHttpRequest.prototype.getAllResponseHeaders = function() {
      return this.xhr.getAllResponseHeaders();
    };
    
    window.XMLHttpRequest.prototype.getResponseHeader = function(header) {
      return this.xhr.getResponseHeader(header);
    };
    
    window.XMLHttpRequest.prototype.overrideMimeType = function(mime) {
      return this.xhr.overrideMimeType(mime);
    };
    
    window.XMLHttpRequest.prototype.send = function(data) {
      const that = this;
      
      // Handle proxy routes via postMessage
      if (that.proxyPath) {
        __proxyFetch(null, that.proxyPath).then(function(response) {
          response.text().then(function(text) {
            that.responseText = text;
            if (that.onreadystatechange) that.onreadystatechange();
            if (that.onload) that.onload();
          });
        });
        return;
      }
      
      // Process in next tick to support libraries that attach handlers after send
      setTimeout(() => {
        // Wire up event handlers
        that.xhr.onerror = that.onerror;
        that.xhr.onprogress = that.onprogress;
        
        if (that.responseType || that.responseType === '') {
          that.xhr.responseType = that.responseType;
        }
        
        // Handle onload
        if (that.onload) {
          const onload = that.onload;
          that.xhr.onload = that.onload = function() {
            try {
              that.response = this.response;
              that.readyState = this.readyState;
              that.status = this.status;
              that.statusText = this.statusText;
            } catch (e) {}
            
            try {
              if (that.responseType === '') {
                that.responseXML = this.responseXML;
                that.responseText = this.responseText;
              }
              if (that.responseType === 'text') {
                that.responseText = this.responseText;
              }
            } catch (e) {}
            
            onload();
          };
        }
        
        // Handle onreadystatechange
        if (that.onreadystatechange) {
          const ready = that.onreadystatechange;
          that.xhr.onreadystatechange = function() {
            try {
              that.readyState = this.readyState;
              that.responseText = this.responseText;
              that.responseXML = this.responseXML;
              that.responseType = this.responseType;
              that.status = this.status;
              that.statusText = this.statusText;
            } catch (e) {}
            
            ready();
          };
        }
        
        // For local files, trigger callbacks directly
        if (that.file) {
          if (that.onreadystatechange) {
            return that.onreadystatechange();
          }
          if (that.onload) {
            return that.onload();
          }
        }
        
        // For real requests, pass through
        that.xhr.send(data);
      }, 0);
    };
  
    // Override fetch API
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      let url = input;
      
      if (input instanceof Request) {
        url = input.url;
      }
      
      const normalizedUrl = __normalizeUrl(url);
      
      // Check proxy routes FIRST
      const proxyRoute = __findProxyRoute(normalizedUrl);
      if (proxyRoute) {
        return __proxyFetch(url, normalizedUrl);
      }
      
      // Intercept requests for local files
      if (__fileNames.includes(normalizedUrl)) {
        const responseText = __files[normalizedUrl];
        
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'ok',
          url: url,
          text: () => Promise.resolve(responseText),
          json: () => Promise.resolve(JSON.parse(responseText)),
          blob: () => Promise.resolve(new Blob([responseText])),
          arrayBuffer: () => {
            const buffer = new ArrayBuffer(responseText.length * 2);
            const bufferView = new Uint16Array(buffer);
            
            for (let i = 0; i < responseText.length; i++) {
              bufferView[i] = responseText.charCodeAt(i);
            }
            
            return Promise.resolve(buffer);
          }
        });
      }
      
      // Pass through to original fetch
      return originalFetch(input, init);
    };
  })();
  </script>`;
}
