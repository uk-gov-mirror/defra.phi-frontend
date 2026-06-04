import { initAll } from 'govuk-frontend'

import '../stylesheets/application.scss'

import '../images/favicon.ico'
import '../images/favicon.svg'
import '../images/govuk-icon-180.png'
import '../images/govuk-icon-192.png'
import '../images/govuk-icon-512.png'
import '../images/govuk-icon-mask.svg'
import './plant-search.js'
import './pest-search.js'
import './country-search.js'

import CookieBanner from './cookie-banner'
import Analytics from './loadAnalytics'
// import config from '~/src/config'
import {
  getConsentCookie,
  isValidConsentCookie,
  removeUACookies
} from './cookie-functions.js'
import CookiesPage from './cookies-page.js'
const $cookieBanner = document.querySelector(
  '[data-module="govuk-cookie-banner"]'
)

if ($cookieBanner) {
  new CookieBanner($cookieBanner)
}

// Initialise analytics if consent is given
const userConsent = getConsentCookie()
if (userConsent && isValidConsentCookie(userConsent) && userConsent.analytics) {
  Analytics()

  // Remove UA cookies if the user previously had them set or Google attempts
  // to set them
  removeUACookies()
}

// Initialise cookie page
const $cookiesPage = document.querySelector('[data-module="app-cookies-page"]')
if ($cookiesPage) {
  new CookiesPage($cookiesPage)
}

function compareNames(a, b) {
  if (a.text < b.text) {
    return -1
  }
  if (a.text > b.text) {
    return 1
  }
  return 0
}

function runPopulate(query, finalArray, populateResults) {
  if (query.length > 2) {
    populateResults(finalArray.sort(compareNames))
  }
}

export function timerFunction(query, finalArray, populateResults) {
  return setTimeout(() => {
    try {
      runPopulate(query, finalArray, populateResults)
    } catch (_) {}
  }, 1000)
}

export function inputValueTemplate(asd) {
  return asd?.text
}

export function suggestionTemplate(asd, regexValue) {
  const inputElementCustom =
    document.getElementsByClassName('custom-hint-class')
  inputElementCustom[0]?.setAttribute('aria-label', 'autocomplete__hint')
  inputElementCustom[0]?.setAttribute('id', 'autocomplete__hint')
  let template
  if (regexValue?.length > 0) {
    template =
      '<div class="suggestions"><span class="name" id="resultName">' +
      asd?.text?.replace(
        new RegExp(regexValue, 'gi'),
        (match) => `<strong>${match}</strong>`
      ) +
      '</span></div>'
  } else {
    template =
      '<div class="suggestions"><span class="name" id="resultName">' +
      asd?.replace(
        new RegExp(asd, 'gi'),
        (match) => `<strong>${match}</strong>`
      ) +
      '</span></div>'
  }
  return template
}

initAll()
