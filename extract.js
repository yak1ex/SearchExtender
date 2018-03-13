(function(){
  if (document.activeElement.form) {
    const form = document.activeElement.form
    const name = document.activeElement.name
    const post = form.method === "post"
    const queryDelim = (post && form.action.indexOf('?') !== -1) ? '??' : '?'

    let query = []
    for (let e of form.elements) {
      if (e.name !== undefined && e.name !== '') {
        if (e.value !== undefined) {
          if ((e.type !== 'checkbox' && e.type !== 'radio') ||
              ((e.type === 'checkbox' || e.type === 'radio') && e.checked)) {
            query.push(`${e.name}=${e.name === name ? '%s' : e.value}`)
          }
        } else {
          query.push(`${e.name}=`)
        }
      }
    }
    const url = form.action + queryDelim + query.join('&')

    const content = 
`  [
    "Name: ${document.title}",
    {
      "omnibox": true,
      "selection": true
    },
    "Key: Please edit",
    "${url}",
    false,
    ${post}
  ]`

    const paster = (f) => {
      if (f) {
        let copyFrom = document.createElement('textarea')
        copyFrom.textContent = content
        document.body.appendChild(copyFrom)
        copyFrom.select()
        document.execCommand('copy')
        document.body.removeChild(copyFrom)
        if (window.confirm('Open option page?\nYou can paste the following content from clipboard to "New from text":\n' + content)) {
          browser.runtime.sendMessage({ command: "showOption" })
        }
      }
    }
    if (browser.isFirefox) {
      browser.permissions.request({ permissions: ['clipboardWrite'] }).then(paster)
    } else paster(true)
  }
})()
