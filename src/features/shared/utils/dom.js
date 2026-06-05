export const DOMUtils = {
  createElement(tag, classes = '', id = '') {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (id) el.id = id;
    return el;
  },

  querySelector(selector) {
    return document.querySelector(selector);
  },

  querySelectorAll(selector) {
    return document.querySelectorAll(selector);
  },

  addClass(element, className) {
    element?.classList.add(className);
  },

  removeClass(element, className) {
    element?.classList.remove(className);
  },

  toggleClass(element, className) {
    element?.classList.toggle(className);
  },

  hasClass(element, className) {
    return element?.classList.contains(className) || false;
  },

  setText(element, text) {
    if (element) element.textContent = text;
  },

  setHTML(element, html) {
    if (element) element.innerHTML = html;
  },

  getAttribute(element, attr) {
    return element?.getAttribute(attr);
  },

  setAttribute(element, attr, value) {
    element?.setAttribute(attr, value);
  },

  addEventListener(element, event, handler) {
    element?.addEventListener(event, handler);
  },

  removeEventListener(element, event, handler) {
    element?.removeEventListener(event, handler);
  },

  on(element, event, handler) {
    return this.addEventListener(element, event, handler);
  },

  off(element, event, handler) {
    return this.removeEventListener(element, event, handler);
  },

  show(element) {
    if (element) element.style.display = '';
  },

  hide(element) {
    if (element) element.style.display = 'none';
  },

  toggle(element) {
    if (element) element.style.display = element.style.display === 'none' ? '' : 'none';
  },
};
