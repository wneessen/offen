var html = require('choo/html')
var _ = require('underscore')

var BarChart = require('./../components/bar-chart')

module.exports = view

function formatPercentage (value) {
  return (value * 100).toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
  })
}

function view (state, emit) {
  function handleOptout () {
    state.model.showPixel = true
    emit(state.events.RENDER)
  }

  function handleOptoutSuccess () {
    emit('offen:query')
  }

  function handlePurge () {
    emit('offen:purge')
  }

  var isOperator = !!(state.params && state.params.accountId)

  var numDays = parseInt(state.query.num_days, 10) || 7

  var accountHeader = null
  var pageTitle
  if (isOperator) {
    var matchingAccount = _.find(state.authenticatedUser.accounts, function (account) {
      return account.accountId === state.model.account.accountId
    })
    if (!matchingAccount) {
      // this is just a backup, if it ever happens outside of development,
      // there is something off with claims authorization in the server application
      emit('offen:bailOut', 'User is not authorized to access account with id "' + state.model.accountId + '".')
      return null
    }
    accountHeader = html`
      <h3><strong>You are viewing data as</strong> operator <strong>with account</strong> ${matchingAccount.name}.</h3>
      <h3><strong>This is the data collected over the last </strong> ${numDays} days.</h3>
    `
    pageTitle = matchingAccount.name + ' | ' + state.title
  } else {
    accountHeader = html`
      <h3><strong>You are viewing data as</strong> user.</h3>
      ${state.model.hasOptedOut ? html`<h3><strong>You have opted out. Clear your cookies to opt in.</strong></h3>` : null}
      ${state.model.allowsCookies ? null : html`<h3><strong>Your browser does not allow 3rd party cookies. We respect this setting and collect only very basic data in this case, yet it also means we cannot display any data to you here.</strong></h3>`}
      <h3><strong>This is your data collected over the last</strong> ${numDays} days <strong>across all sites.</strong></h3>
    `
    pageTitle = 'user | ' + state.title
  }
  emit(state.events.DOMTITLECHANGE, pageTitle)

  var uniqueEntities = isOperator
    ? state.model.uniqueUsers
    : state.model.uniqueAccounts
  var entityName = isOperator
    ? 'users'
    : 'accounts'
  var uniqueSessions = state.model.uniqueSessions
  var usersAndSessions = html`
    <div class="row">
      <h4><strong>${uniqueEntities}</strong> unique ${entityName} </h4>
      <h4><strong>${uniqueSessions}</strong> unique sessions</h4>
      <h4><strong>${formatPercentage(state.model.bounceRate)}%</strong> bounce rate</h4>
      ${isOperator ? html`<h4><strong>${formatPercentage(state.model.loss)}%</strong> plus</h4>` : null}
    </div>
  `

  var chartData = {
    data: state.model.pageviews,
    isOperator: isOperator
  }
  var chart = html`
    <h4>Pageviews and ${isOperator ? 'Visitors' : 'Accounts'}</h4>
    ${state.cache(BarChart, 'bar-chart').render(chartData)}
  `
  var pagesData = state.model.pages
    .map(function (row) {
      return html`
        <tr>
          <td>${row.url}</td>
          <td>${row.pageviews}</td>
        </tr>
      `
    })

  var pages = html`
    <h4>Top pages</h4>
    <table class="table-full-width">
      <thead>
        <tr>
          <td>URL</td>
          <td>Pageviews</td>
        </tr>
      </thead>
      <tbody>
        ${pagesData}
      </tbody>
    </table>
  `
  var referrerData = state.model.referrers
    .map(function (row) {
      return html`
        <tr>
          <td>${row.host}</td>
          <td>${row.pageviews}</td>
        </tr>
      `
    })

  var referrers = referrerData.length
    ? html`
      <h4>Top referrers</h4>
      <table class="table-full-width">
        <thead>
          <tr>
            <td>Host</td>
            <td>Pageviews</td>
          </tr>
        </thead>
        <tbody>
          ${referrerData}
        </tbody>
      </table>
    `
    : null

  var optoutPixelSrc = state.model.hasOptedOut
    ? process.env.OPT_IN_PIXEL_LOCATION
    : process.env.OPT_OUT_PIXEL_LOCATION
  var optoutPixel = state.model.showPixel
    ? html`<img data-role="optout-pixel" src="${optoutPixelSrc}" onload=${handleOptoutSuccess}>`
    : null
  var manage = !isOperator && state.model.allowsCookies
    ? html`
      <h4>Manage your data</h4>
      <div class="button-wrapper btn-fill-space">
        <button class="btn btn-color-grey" data-role="optout" onclick="${handleOptout}">
          ${state.model.hasOptedOut ? 'Opt in' : 'Opt out'}
        </button>
        <button class="btn btn-color-grey" data-role="purge" onclick="${handlePurge}">
          Delete my data
        </button>
      </div>
      <div class="opt-out-pixel">
        ${optoutPixel}
      </div>
    `
    : null

  var withSeparators = [accountHeader, usersAndSessions, chart, pages, referrers, manage]
    .filter(function (el) {
      return el
    })
    .map(function (el) {
      return html`${el}<hr>`
    })
  return html`
    <div>
      ${withSeparators}
    </div>
  `
}