import morphdom from "morphdom";

class Brutto {
  constructor() {
    this.states = {};
    const el = document.documentElement;
    const markup = el.innerHTML;
    history.replaceState({ id: this.saveState(location.href, markup) }, "");

    window.addEventListener("popstate", this.historyPop.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("submit", this.onSubmit.bind(this));
    window.addEventListener("load", this.partialFireEvent("turbo:load"), false);

    this.loadFrames();
  }

  loadFrames() {
    const frames = Array.from(document.querySelectorAll("turbo-frame[src]"));
    for (var i = frames.length - 1; i >= 0; i--) {
      this.visit(frames[i].getAttribute("src"), frames[i]);
    }
  }

  partialFireEvent(evt) {
    return function () {
      const event = new CustomEvent(evt);
      document.dispatchEvent(event);
    };
  }

  renderFrame(frame, markup) {
    const dom = this.markupToDom(markup);
    morphdom(frame, dom.getElementById(frame.id));
  }

  markupToDom(markup) {
    var parser = new DOMParser();
    return parser.parseFromString(markup, "text/html");
  }

  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      this.visit(e.target.href, e.target);
    }
  }

  async visit(url, el) {
    const response = await fetch(url);
    if (response.status == 301 || response.status == 302) {
      return this.visit(response.url);
    }
    const markup = await response.text();
    const frame = this.getParentFrame(el);
    if (frame) {
      this.renderFrame(frame, markup);
      this.partialFireEvent("turbo:frame-load")();
    } else {
      this.historyPush(url, markup);
      this.render(markup);
    }
  }

  getParentFrame(el) {
    return el.closest("turbo-frame");
  }

  onSubmit(e) {
    e.preventDefault();
    this.submit(e.originalTarget);
  }

  async submit(el) {
    const values = new FormData(el);
    const response = await this.formFetch(el, values);
    if (response.status == 301 || response.status == 302) {
      return this.visit(response.url);
    }
    const markup = await response.text();
    const frame = this.getParentFrame(el);
    if (frame) {
      this.renderFrame(frame, markup);
      this.partialFireEvent("turbo:frame-load")();
    } else {
      this.historyPush(url, markup);
      this.render(markup);
    }
  }

  formFetch(form, values) {
    if (form.method.toLowerCase() == "get") {
      const url = form.action + "?" + new URLSearchParams(values);
      return fetch(url, { method: form.method });
    } else {
      return fetch(form.action, { method: form.method, body: values });
    }
  }

  // submit(e) {
  //   e.preventDefault();
  //   const form = e.target.closest("form");
  //   const formData = new FormData(form);

  //   if (form.method.toLowerCase() == "get") {
  //     const query = new URLSearchParams(formData).toString();
  //     this.visit(form.action + "?" + query);
  //   } else {
  //     fetch(form.action, { method: "post", body: formData })
  //       .then((r) => r.text())
  //       .then(this.historyPush(form.action).bind(this))
  //       .then(this.render.bind(this));
  //   }
  // }

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
