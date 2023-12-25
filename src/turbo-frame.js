import morphdom from "morphdom";

export default class TurboFrame extends window.HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", this.onClick.bind(this), false);
    this.addEventListener("submit", this.onSubmit.bind(this), false);
    if (this.getAttribute("src")) {
      this.load(this.getAttribute("src"));
    }
  }

  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      e.stopPropagation();
      window.Brutto.visit(e.target.href, this.onVisit.bind(this));
    }
  }

  onSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    window.Brutto.submit(e.target, this.render.bind(this));
  }

  onVisit(url, markup) {
    this.render(markup);
    window.requestAnimationFrame(window.Brutto.partialFireEvent("turbo:load"));
  }

  async load(url) {
    const response = await fetch(url);
    if (response.status == 404) {
      return console.warn("URL '" + url + "' returns 404 Not Found!", this);
    }
    if (response.status == 301 || response.status == 302) {
      return this.load(response.url);
    }
    const markup = await response.text();
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    morphdom(this, dom.body);
  }

  render(markup) {
    if (this.id == "") {
      console.warn("No id on turbo-frame element!", this);
      return false;
    }
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    morphdom(this, dom.getElementById(this.id));
  }

  loadSrc(src) {

  }
}
