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
  }

  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      return this.visit(e.target.href);
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
    const state = this.states[obj.state.id];
    morphdom(document.documentElement, state.cache);
    window.scrollTo(state.scroll.x, state.scroll.y);
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
