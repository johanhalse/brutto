import morphdom from "morphdom";

const inputTypes = ["submit", "button"];

class Brutto {
  constructor() {
    this.states = {};
    const el = document.documentElement;
    const markup = el.innerHTML;
    history.replaceState({ id: this.saveState(location.href, markup) }, "");
    window.addEventListener("popstate", this.historyPop.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("submit", this.onSubmit.bind(this));

    this.loadFrames();
  }

  loadFrames() {
    const frames = Array.from(document.querySelectorAll("turbo-frame[src]"));
    const self = this;
    frames.forEach(function (frame) {
      self.loadFrame(frame, frame.getAttribute("src"));
    });
  }

  loadFrame(frame, url) {
    fetch(url)
      .then((r) => r.text())
      .then(this.renderFrame(frame).bind(this));
  }

  renderFrame(frame) {
    return function (response) {
      const dom = this.responseToDom(response);
      morphdom(frame, dom.getElementById(frame.id));
    };
  }

  responseToDom(response) {
    var parser = new DOMParser();
    return parser.parseFromString(response, "text/html");
  }

  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      return this.beforeVisit(e.target, e.target.href);
    }
  }

  onSubmit(e) {
    e.preventDefault();
    const form = e.target.closest("form");
    const formData = new FormData(form);

    if (form.method.toLowerCase() == "get") {
      const query = new URLSearchParams(formData).toString();
      this.visit(form.action + "?" + query);
    } else {
      fetch(form.action, { method: "post", body: formData })
        .then((r) => r.text())
        .then(this.historyPush(form.action).bind(this))
        .then(this.render.bind(this));
    }
  }

  beforeVisit(el, url) {
    const frameParent = el.closest("turbo-frame");
    if (frameParent) {
      return this.loadFrame(frameParent, url);
    }

    this.visit(url);
  }

  visit(url) {
    fetch(url)
      .then((r) => r.text())
      .then(this.historyPush(url).bind(this))
      .then(this.render.bind(this));
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

  historyPush(url) {
    const self = this;
    return (markup) => {
      history.pushState({ id: self.saveState(url, markup) }, "", url);
      return markup;
    };
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
