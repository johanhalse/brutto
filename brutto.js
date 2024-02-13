import morphdom from "morphdom";
import Http from "./lib/http.js";
import TurboFrame from "./lib/turbo-frame.js";

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

  async visit(url, method, stream) {
    const response = await this.getLinkResponse(url, method);
    if (response.redirected) {
      return this.visit(response.url, "get");
    }

    const markup = await response.text();
    if (stream) {
      this.renderStream(markup)
    }
    else {
      this.historyPush(response.url, markup);
      this.render(markup);
    }
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }

  async submit(el, stream) {
    const response = await this.getFormResponse(el);
    if (response.redirected) {
      return this.visit(response.url, "get");
    }

    const markup = await response.text();
    if (stream) {
      this.renderStream(markup)
    }
    else {
      this.historyPush(response.url, markup);
      this.render(markup);
    }
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }

  renderStream(markup, url) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    Array.from(dom.querySelectorAll("turbo-stream")).forEach(this.processStreamTemplate.bind(this));
  }

  processStreamTemplate(streamNode) {
    const action = streamNode.getAttribute("action");
    const target = streamNode.getAttribute("target");
    const targets = streamNode.getAttribute("targets");
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

Object.assign(Brutto.prototype, Http);
const brutto = new Brutto();
window.Brutto = brutto;
export default brutto;
