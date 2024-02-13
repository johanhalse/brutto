import morphdom from "morphdom";
import TurboFrame from "./src/turbo-frame";

class Brutto {
  constructor() {
    this.states = {};
    window.addEventListener("popstate", this.historyPop.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("submit", this.onSubmit.bind(this));
    window.addEventListener("load", this.partialFireEvent("turbo:load"), false);

    this.initFrames();
  }

  initFrames() {
    window.customElements.define("turbo-frame", TurboFrame);
  }

  partialFireEvent(evt) {
    return function () {
      const event = new CustomEvent(evt);
      document.dispatchEvent(event);
    };
  }

  onClick(e) {
    if (e.target.dataset["turbo"] == "false") { return; }
    if (e.target.nodeName == "A") {
      e.preventDefault();
      history.replaceState({ id: this.saveState(location.href, document.documentElement.innerHTML) }, "");
      if (e.target.dataset["turboMethod"]) {
        this.patch(e.target.href, e.target, e.target.dataset["turboMethod"]);
      }
      else {
        this.visit(e.target.href, e.target);
      }
    }
  }

  async patch(url, el, method) {
    const f = `<form method="post" action="${url}"><input type="hidden" name="_method" value="${method}" /></form>`;
    const parser = new DOMParser();
    const form = parser.parseFromString(f, "text/html").querySelector("form");
    this.submit(form, this.afterSubmit.bind(this));
  }

  async visit(url, el) {
    const response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml,application/xml" } });
    if (response.status == 301 || response.status == 302) {
      return this.visit(response.url);
    }
    const markup = await response.text();
    this.historyPush(url, markup);
    this.render(markup);
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }

  onSubmit(e) {
    e.preventDefault();

    if (e.target.dataset["turboStream"] != undefined) {
      this.submit(e.target, this.stream.bind(this));
    }
    else {
      this.submit(e.target, this.afterSubmit.bind(this));
    }
  }

  async submit(el, cb) {
    const values = new FormData(el);
    const url = this.formUrl(el, values);
    const response = await this.formFetch(el, url, values);
    if (response.status == 204) {
      return this.visit(url);
    }
    const markup = await response.text();
    cb(markup, response.url);
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }

  stream(markup, url) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    Array.from(dom.querySelectorAll("turbo-stream")).forEach(this.processStreamTemplate.bind(this));
  }

  processStreamTemplate(streamNode) {
    const action = streamNode.getAttribute("action");
    const target = streamNode.getAttribute("target");
    const targets = streamNode.getAttribute("targets"); // TODO
    const template = streamNode.querySelector("template");

    if (target) {
      this.processStreamTarget(document.getElementById(target), action, template);
    }
    if (targets) {
      const targetEls = document.querySelectorAll(targets);
      for(let i = 0; i < targetEls.length; i++) {
        this.processStreamTarget(targetEls[i], action, template);
      }
    }
  }

  processStreamTarget(target, action, template) {
    switch(action) {
    case "after":
      target.after(template.content.cloneNode(true));
      break;
    case "append":
      target.append(template.content.cloneNode(true));
      break;
    case "before":
      target.parentElement.insertBefore(template.content.cloneNode(true), target);
      break;
    case "prepend":
      target.prepend(template.content.cloneNode(true));
      break;
    case "remove":
      target.remove();
      break;
    case "update":
      target.replaceChildren(template.content.cloneNode(true));
      break;
    }
  }

  afterSubmit(markup, url) {
    this.historyPush(url, markup);
    this.render(markup);
  }

  formUrl(form, values) {
    if (form.method.toLowerCase() == "get") {
      return form.action + "?" + new URLSearchParams(values);
    } else {
      return form.action;
    }
  }

  acceptValue(form) {
    if (form.dataset["turbo-stream"]) {
      return "text/vnd.turbo-stream.html, text/html, application/xhtml+xml";
    }
    else {
      return "text/html,application/xhtml+xml,application/xml";
    }
  }

  formFetch(form, url, values) {
    const token = this.getCookieValue(this.getMetaContent("csrf-param")) || this.getMetaContent("csrf-token");
    if (form.method.toLowerCase() == "get") {
      return fetch(url, {
        method: form.method,
        headers: { Accept: this.acceptValue(form), "X-CSRF-Token": token },
      });
    } else {
      return fetch(url, {
        method: form.method,
        body: values,
        headers: { Accept: this.acceptValue(form), "X-CSRF-Token": token },
      });
    }
  }

  getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie) => cookie.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : undefined;
      }
    }
  }

  getMetaContent(name) {
    const element = document.querySelector(`meta[name="${name}"]`);
    return element && element.content;
  }

  saveState(url, markup) {
    const randomId = self.crypto.randomUUID();
    this.states[randomId] = {
      url: url,
      cache: markup,
      scroll: this.getScrollPosition(),
    };

    return randomId;
  }

  render(response) {
    morphdom(document.documentElement, response);
    return response;
  }

  historyPush(url, markup) {
    history.pushState({ id: this.saveState(url, markup) }, "", url);
    return markup;
  }

  historyPop(obj) {
    try {
      const state = this.states[obj.state.id];
      morphdom(document.documentElement, state.cache);
      window.scrollTo(state.scroll.x, state.scroll.y);
      window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
    } catch (err) {
      location.href = location.href;
    }
  }

  getScrollPosition() {
    return {
      x: window.scrollX,
      y: window.scrollY,
    };
  }
}

const brutto = new Brutto();
window.Brutto = brutto;
export default brutto;
