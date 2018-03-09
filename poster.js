(function(){
  'use strict'

  // from https://stackoverflow.com/a/23687543 with style change and multiple value support
  let onMessageHandler = function(message){
    // Ensure it is run only once, as we will try to message twice
    chrome.runtime.onMessage.removeListener(onMessageHandler)

    // code from https://stackoverflow.com/a/7404033/934239
    let form = document.createElement("form")
    form.setAttribute("method", "post")
    form.setAttribute("action", message.url)
    for (let key in message.data) {
      let values = (message.data[key] instanceof Array) ? message.data[key] : [message.data[key]]
      for (let value of values) {
        let hiddenField = document.createElement("input")
        hiddenField.setAttribute("type", "hidden")
        hiddenField.setAttribute("name", key)
        hiddenField.setAttribute("value", value)
        form.appendChild(hiddenField)
      }
    }
    document.body.appendChild(form)
    form.submit()
  }

  chrome.runtime.onMessage.addListener(onMessageHandler)
})()
