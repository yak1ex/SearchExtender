(function (g) {
  /* global browser */
  'use strict'

  // from https://stackoverflow.com/a/23687543 with style change and multiple value support
  let onMessageHandler = message => {
    // Ensure it is run only once, as we will try to message twice
    g.browser.runtime.onMessage.removeListener(onMessageHandler)

    // code from https://stackoverflow.com/a/7404033/934239
    let form = document.createElement('form')
    form.method = 'post'
    form.action = message.url
    for (let key in message.data) {
      let values = (message.data[key] instanceof Array) ? message.data[key] : [message.data[key]]
      for (let value of values) {
        let hiddenField = document.createElement('input')
        hiddenField.type = 'hidden'
        hiddenField.name = key
        hiddenField.value = value
        form.appendChild(hiddenField)
      }
    }
    if ('charset' in message && message.charset !== '') {
      form.setAttribute('accept-charset', message.charset)
    }
    document.body.appendChild(form)
    form.submit()
  }

  g.browser.runtime.onMessage.addListener(onMessageHandler)
})(g)
