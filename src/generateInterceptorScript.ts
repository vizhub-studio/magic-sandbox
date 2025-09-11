/**
 * Generates the script that intercepts XMLHttpRequest and fetch calls
 */
export function generateInterceptorScript(
  fileNames: string[],
  filesString: string,
): string {
  return `<script>
  (function() {
    // Store file data for interception
    const __filesURI = "${filesString}";
    const __files = JSON.parse(decodeURIComponent(__filesURI));
    const __fileNames = ${JSON.stringify(fileNames)};
  
    // Override XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      this.xhr = new OriginalXHR();
      return this;
    };
  
    // Override open method to intercept file requests
    window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      // Normalize relative URLs by removing './' prefix
      let normalizedUrl = url;
      if (typeof url === 'string' && url.startsWith('./')) {
        normalizedUrl = url.substring(2);
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
      if (this.file) return;
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
      
      // Fix blob:// protocol issues
      if (typeof url === 'string') {
        url = url.replace('blob://', 'http://');
      }
      
      // Normalize relative URLs by removing './' prefix
      let normalizedUrl = url;
      if (typeof url === 'string' && url.startsWith('./')) {
        normalizedUrl = url.substring(2);
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
