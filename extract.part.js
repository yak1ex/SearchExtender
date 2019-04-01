(function (g) {
  if (document.activeElement.form) {
    const form = document.activeElement.form
    const name = document.activeElement.name
    const post = form.method === 'post'
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

    let top = window.parent
    while(top.parent != top) {
      top = top.parent
    }

    const content = [
      top.document.title,
      5,
      "",
      url,
      false,
      post
    ]

    g.browser.runtime.sendMessage({ command: 'showOptionWithConf', content: content })
  }
})(g)
