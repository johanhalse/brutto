export default {
  createPatchForm(url, method) {
    const f = `<form method="post" action="${url}"><input type="hidden" name="_method" value="${method}" /></form>`;
    const parser = new DOMParser();
    return parser.parseFromString(f, "text/html").querySelector("form");
  },

  findLink(target) {
    if (target.nodeName == "A") { return target; }
    const closest = target.closest("a");
    return closest || null;
  },

  getAcceptValueFromTarget(target) {
    return this.getAcceptValue(target.dataset["turboStream"] != undefined);
  },

  getAcceptValue: function(stream) {
    return (stream) ?
      "text/vnd.turbo-stream.html" :
      "text/html,application/xhtml+xml,application/xml";
  },

  getBody(target) {
    return new FormData(target);
  },

  getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie) => cookie.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : undefined;
      }
    }
  },

  getFormResponse: async function(target, stream) {
    return await this.performSubmit(
      this.getUrl(target),
      this.getMethod(target),
      this.getBody(target),
      this.getAcceptValue(stream)
    );
  },

  getLinkResponse: async function(url, method, stream) {
    if (method == "get") {
      return this.performFetch(url, this.getAcceptValue(stream));
    }
    else {
      const patchForm = this.createPatchForm(url, method);
      return this.getFormResponse(patchForm);
    }
  },

  getMetaContent(name) {
    const element = document.querySelector(`meta[name="${name}"]`);
    return element && element.content;
  },

  getMethod(target) {
    if (target.dataset["turboMethod"]) {
      return target.dataset["turboMethod"].toLowerCase();
    }

    if (target.method) {
      return target.method;
    }

    return "get";
  },

  getUrl(target) {
    if (target.getAttribute("action")) {
      return target.getAttribute("action");
    }

    return target.getAttribute("href");
  },

  onClick(e) {
    const link = this.findLink(e.target);
    if (link == null) { return true; }
    if (link.dataset["turbo"] == "false") { return true; }

    e.preventDefault();
    e.stopPropagation();
    this.visit(
      this.getUrl(link),
      this.getMethod(link),
      link.dataset["turboStream"] != undefined
    );
  },

  onSubmit(e) {
    if (e.target.dataset["turbo"] == "false") { return true; }
    e.preventDefault();
    e.stopPropagation();
    this.submit(e.target, e.target.dataset["turboStream"] != undefined);
  },

  performFetch: function(url, acceptValue) {
    return fetch(url, { headers: { Accept: acceptValue } });
  },

  performSubmit: async function(url, method, body, acceptValue) {
    const token = this.getCookieValue(this.getMetaContent("csrf-param")) || this.getMetaContent("csrf-token");
    if (method == "get") {
      return this.performFetch(this.queryValueUrl(url, body), acceptValue)
    } else {
      return fetch(url, {
        method: method,
        body: body,
        headers: { "Accept": acceptValue, "X-CSRF-Token": token },
      });
    }
  },

  queryValueUrl(url, body) {
    const params = new URLSearchParams(body);
    return `${url}?${params}`;
  }
}


