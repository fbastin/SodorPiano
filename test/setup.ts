// The parsers read XML with the browser's DOMParser: jsdom provides it.
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
globalThis.DOMParser = window.DOMParser;
globalThis.XMLSerializer = window.XMLSerializer;
