import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';
import {
  loadCommerceEager,
  loadCommerceLazy,
  initializeCommerce,
  applyTemplates,
  decorateLinks,
} from './commerce.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  decorateLinks(main);
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Checks if running in sidekick library iframe and sets up dummy config data
 */
function setupSidekickLibraryConfig() {
  // Check if running in iframe and sidekick library
  if (window.self !== window.top && window.top.blocks) {
    const configData = {
      public: {
        default: {
          'commerce-core-endpoint': 'https://www.aemshop.net/graphql',
          'commerce-endpoint': 'https://www.aemshop.net/cs-graphql',
          headers: {
            all: {
              Store: 'default',
            },
            cs: {
              'Magento-Customer-Group': 'b6589fc6ab0dc82cf12099d1c2d40ab994e8410c',
              'Magento-Store-Code': 'main_website_store',
              'Magento-Store-View-Code': 'default',
              'Magento-Website-Code': 'base',
              'x-api-key': '4dfa19c9fe6f4cccade55cc5b3da94f7',
              'Magento-Environment-Id': 'f38a0de0-764b-41fa-bd2c-5bc2f3c7b39a',
            },
          },
          analytics: {
            'base-currency-code': 'USD',
            environment: 'Production',
            'environment-id': 'f38a0de0-764b-41fa-bd2c-5bc2f3c7b39a',
            'store-code': 'main_website_store',
            'store-id': 1,
            'store-name': 'Main Website Store',
            'store-url': 'https://www.aemshop.net',
            'store-view-code': 'default',
            'store-view-id': 1,
            'store-view-name': 'Default Store View',
            'website-code': 'base',
            'website-id': 1,
            'website-name': 'Main Website',
          },
          plugins: {
            picker: {
              rootCategory: '2',
            },
          },
          'commerce-assets-enabled': false,
        },
        '/fr/': {
          headers: {
            all: {
              Store: 'fr',
            },
            cs: {
              'Magento-Store-Code': 'fr_store',
              'Magento-Website-Code': 'fr_website',
              'Magento-Store-View-Code': 'fr',
            },
          },
        },
      },
      ':expiry': Math.round(Date.now() / 1000) + 7200,
    };

    try {
      sessionStorage.setItem('config', JSON.stringify(configData));
      // eslint-disable-next-line no-console
      console.log('Sidekick library config data set in session storage');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to set sidekick library config in session storage:', e);
    }
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  // Setup sidekick library config if running in iframe
  setupSidekickLibraryConfig();

  const main = doc.querySelector('main');
  if (main) {
    await initializeCommerce();
    decorateMain(main);
    applyTemplates(doc);
    await loadCommerceEager();
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCommerceLazy();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());
