import morphdom from "morphdom";

/**
 * The main Brutto object.
 * @class
 * @module Brutto
 */
class Brutto {
  /**
   * An object to keep track of user's scroll position within a document.
   * @typedef {Object} ScrollPosition
   * @property {number} x User's X scroll position
   * @property {number} y User's Y scroll position
   */

  /**
   * A State object for pushState history.
   * @typedef {Object} State
   * @property {string} url URL to associate state with
   * @property {string} cache Cached markup at save time
   * @property {ScrollPosition} User's scroll position at save time
   */
  constructor() {
    /**
     * State array
     * @type {Object.<string, State>}
     */
    this.states = {};
    const el = document.documentElement;
    const markup = el.innerHTML;
    history.replaceState({ id: this.saveState(location.href, markup) }, "");
    window.addEventListener("popstate", this.historyPop.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("submit", this.onSubmit.bind(this));

    this.loadFrames();
  }

  /**
   * Loads all frames present on the page from their `src` property. Used at page
   * load.
   * @return {null}
   */
  loadFrames() {
    const frames = Array.from(document.querySelectorAll("turbo-frame[src]"));
    const self = this;
    frames.forEach(function (frame) {
      self.loadFrame(frame, frame.getAttribute("src"));
    });
  }

  /**
   * Loads a single frame from a URL.
   * @param  {Element} frame Parent frame element
   * @param  {string} url The frame element's src attribute
   * @return {null}
   */
  loadFrame(frame, url) {
    fetch(url)
      .then((r) => r.text())
      .then(this.renderFrame(frame));
  }

  /**
   * Renders a response string to a frame.
   * @param  {Element} frame The frame object whose markup will be replaced.
   * @return {(response: string) => null} A partially applied function that takes a response string
   */
  renderFrame(frame) {
    const self = this;
    return function (response) {
      const dom = self.responseToDom(response);
      morphdom(frame, dom.getElementById(frame.id));
    };
  }

  /**
   * Turns a response string into a queryable HTML document.
   * @param  {string} response Response string to parse into DOM object
   * @return {HTMLDocument}
   */
  responseToDom(response) {
    var parser = new DOMParser();
    return parser.parseFromString(response, "text/html");
  }

  /**
   * Global click handler. Handles the click if applicable, otherwise lets it
   * bubble.
   * @param  {Event} e Click event
   * @return {null}
   */
  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      return this.beforeVisit(e.target, e.target.href);
    }
  }

  /**
   * Runs before a visit is performed, to determine whether it's a frame or not
   * and if we shoud perform it.
   * @param  {Element} el Clicked target element
   * @param  {string} url URL to visit
   * @return {null|function}
   */
  beforeVisit(el, url) {
    const frameParent = el.closest("turbo-frame");
    if (frameParent) {
      return this.loadFrame(frameParent, url);
    }

    this.visit(url);
  }

  /**
   * Performs a full-page visit via XHR.
   * @param  {string} url URL to visit
   * @return {null}
   */
  visit(url) {
    fetch(url)
      .then((r) => r.text())
      .then(this.historyPush(url).bind(this))
      .then(this.render.bind(this));
  }

  /**
   * Global handler for form submission events.
   * @param  {Event} e Submit event
   * @return {null|function}
   */
  onSubmit(e) {
    const frameParent = e.target.closest("turbo-frame");
    if (frameParent) {
      return this.submitFrame(frameParent, e);
    }

    this.submit(e);
  }

  /**
   * Runs before a form submission, to determine if we're in a frame or if there
   * are any other special cases that need handling.
   * @param  {Element} el Form event target
   * @param  {string} url URL to submit to
   * @return {null|function}
   */
  beforeSubmit(el, url) {
    const frameParent = el.closest("turbo-frame");
    if (frameParent) {
      return this.loadFrame(frameParent, url);
    }

    this.visit(url);
  }

  submitFrame(frameParent, e) {
    const values = new FormData(e.target);
    e.preventDefault();
    this.formFetch(e.target, values)
      .then((r) => r.text())
      .then(this.renderFrame(frameParent));
  }

  formFetch(form, values) {
    if (form.method.toLowerCase() == "get") {
      const url = form.action + "?" + new URLSearchParams(values);
      return fetch(url, { method: form.method });
    } else {
      return fetch(form.action, { method: form.method, body: values });
    }
  }

  /**
   * Handles form submission when not in a turbo frame.
   * @param  {Event} Form submission event
   * @return {null}
   */
  submit(e) {
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

  /**
   * Saves the current markup of the page in a cache for insta-navigation.
   * @param  {string} url URL to display in browser bar for this markup
   * @param  {string} markup Page markup to save for this particular URL
   * @return {string} A randomly-generated UUID to associate with this state
   */
  saveState(url, markup) {
    const randomId = self.crypto.randomUUID();
    this.states[randomId] = {
      url: url,
      cache: markup,
      scroll: this.getScrollPosition(),
    };

    return randomId;
  }

  /**
   * Renders a response string for full-page replacement.
   * @param  {string} response Markup to render to full-page document
   * @return {string} Response markup if further processing is needed
   */
  render(response) {
    morphdom(document.documentElement, response);
    return response;
  }

  /**
   * Saves current markup in cache and updates URL in browser bar.
   * @param  {string} url URL to save in cache and then put in browser URL bar
   * @return {(markup:string) => string}
   */
  historyPush(url) {
    const self = this;
    return (markup) => {
      history.pushState({ id: self.saveState(url, markup) }, "", url);
      return markup;
    };
  }

  /**
   * Handles `back` navigation from browser, replacing with cache or performing
   * a full-page visit.
   * @param  {State|null} obj Cache state to replace markup with
   * @return {null}
   */
  historyPop(obj) {
    try {
      const state = this.states[obj.state.id];
      morphdom(document.documentElement, state.cache);
      window.scrollTo(state.scroll.x, state.scroll.y);
    } catch (err) {
      location.href = location.href;
    }
  }

  /**
   * Get browser's current scroll position.
   * @return {ScrollPosition} X and Y coordinates for user's current scroll
   */
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
