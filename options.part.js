(function (g) {
  'use strict'

  /* global browser dialogPolyfill XMLHttpRequest */
  // TODO: Use contentEditable feature

  let options
  let elem = new Proxy({}, {
    get: function (target, name) {
      if (!(name in target)) {
        target[name] = document.getElementById(name)
      }
      return target[name]
    }
  })

  let myAlert = (title, message) => {
    elem.alertTitle.textContent = title
    elem.alertMessage.textContent = message
    elem.alert.showModal()
  }

  let myConfirm = (message, cb) => {
    elem.confirmMessage.textContent = message
    let cbTrue, cbFalse
    let makeCb = (f) => () => {
      elem.confirmConfirm.removeEventListener('click', cbTrue)
      elem.cancelConfirm.removeEventListener('click', cbFalse)
      elem.confirm.close()
      cb(f)
    }
    cbTrue = makeCb(true)
    cbFalse = makeCb(false)
    elem.confirmConfirm.addEventListener('click', cbTrue)
    elem.cancelConfirm.addEventListener('click', cbFalse)
    elem.confirm.showModal()
  }

  let checkValidity = (v, curname, curkey) => {
    if (v.name === '') return 'Empty name'
    if (v.name !== curname && options.searches.map(x => x.name).indexOf(v.name) !== -1) return `name: '${v.name}' is already used`
    if (v.key !== '' && v.key !== curkey && options.searches.conf.map(x => x.key).indexOf(v.key) !== -1) return `key: '${v.key}' is already used`
    if (v.url === '') return 'Empty query'
    return null
  }

  let showDetail = (cb) => {
    let cbTrue, cbFalse
    let makeCb = (f) => (e) => {
      if (f) {
        const err = checkValidity(fromDetail(), elem.name.getAttribute('data-current'), elem.key.getAttribute('data-current'))
        if (err) {
          e.preventDefault()
          myAlert('Invalid conf', err)
          return
        }
      }
      elem.update.removeEventListener('click', cbTrue)
      elem.cancel.removeEventListener('click', cbFalse)
      elem.detail.close()
      cb(f)
    }
    cbTrue = makeCb(true)
    cbFalse = makeCb(false)
    elem.update.addEventListener('click', cbTrue)
    elem.cancel.addEventListener('click', cbFalse)
    elem.detail.showModal()
  }

  let initDetail = () => {
    elem.update.value = 'Add'
    elem.heading.textContent = 'New search config'
    elem.name.value = ''
    elem.name.setAttribute('data-current', '')
    elem.omnibox.checked = false
    g.Conf.TARGET_KEYS.forEach(id => { elem[id].checked = false })
    elem.key.value = ''
    elem.key.setAttribute('data-current', '')
    elem.query.value = ''
    elem.curtab.checked = false
    elem.post.checked = false
  }

  let setDetail = v => {
    elem.update.value = 'Update'
    elem.heading.textContent = 'Edit search config'
    elem.name.value = v.name
    elem.name.setAttribute('data-current', v[0])
    g.Conf.TARGET_KEYS.forEach((key, idx) => { elem[key].checked = ((v.target & (1 << idx)) !== 0) })
    elem.key.value = v.key
    elem.key.setAttribute('data-current', v.key)
    elem.query.value = v.url
    elem.curtab.checked = v.curTab
    elem.post.checked = v.isPost
  }

  let setDetailNew = v => {
    elem.update.value = 'Add'
    elem.heading.textContent = 'New search config'
    elem.name.value = v.name
    elem.name.setAttribute('data-current', '')
    g.Conf.TARGET_KEYS.forEach((key, idx) => { elem[key].checked = ((v.target & (1 << idx)) !== 0) })
    elem.key.value = ''
    elem.key.setAttribute('data-current', '')
    elem.query.value = v.url
    elem.curtab.checked = v.curTab
    elem.post.checked = v.isPost
  }

  let fromDetail = () => {
    return {
      name: elem.name.value,
      target: g.Conf.TARGET_KEYS.reduce((acc, key, idx) => acc + (elem[key].checked ? (1 << idx) : 0), 0),
      key: elem.key.value,
      url: elem.query.value,
      curTab: elem.curtab.checked,
      isPost: elem.post.checked
    }
  }

  let showFromText = (cb) => {
    let cbTrue, cbFalse
    let makeCb = (f) => (e) => {
      if (f) {
        const v = g.Conf.fromExternal([JSON.parse(elem.entry.value)])
        if (v instanceof Error) {
          e.preventDefault()
          myAlert('Invalid configuration', v.message)
          return
        } else {
          const err = checkValidity(v[0], '', '')
          if (err) {
            e.preventDefault()
            myAlert('Invalid configuration', err)
            return
          }
        }
      }
      elem.confirmFromText.removeEventListener('click', cbTrue)
      elem.cancelFromText.removeEventListener('click', cbFalse)
      elem.fromText.close()
      cb(f)
    }
    cbTrue = makeCb(true)
    cbFalse = makeCb(false)
    elem.entry.value = ''
    elem.confirmFromText.addEventListener('click', cbTrue)
    elem.cancelFromText.addEventListener('click', cbFalse)
    elem.fromText.showModal()
  }

  let createRow = v => {
    let tr = document.createElement('tr')
    tr.id = 'row' + v.name
    let editButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    editButton.setAttribute('class', 'btn')
    editButton.setAttribute('type', 'button')
    editButton.setAttribute('value', 'Edit...')
    editButton.addEventListener('click', () => {
      setDetail(v)
      showDetail(f => {
        if (f) {
          let newV = fromDetail()
          options.searches.replaceEntry(newV)
          elem.table.replaceChild(createRow(newV), tr)
          elem.dirtyAlert.textContent = 'Change(s) may not be saved'
        }
      })
    })
    tr.appendChild(document.createElement('td')).innerText = v.name
    for (let j of g.Conf.TARGET_KEYS.map((v, i) => 1 << i)) {
      let cb = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
      cb.parentElement.setAttribute('class', 'checkbox')
      cb.setAttribute('type', 'checkbox')
      if (v.target & j) cb.checked = true
      cb.disabled = true
      elem.dirtyAlert.textContent = 'Change(s) may not be saved'
    }
    tr.appendChild(document.createElement('td')).innerText = v.key
    tr.appendChild(document.createElement('td')).innerText = v.url
    let cbCurtab = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    cbCurtab.parentElement.setAttribute('class', 'checkbox')
    cbCurtab.setAttribute('type', 'checkbox')
    if (v.curTab) cbCurtab.checked = true
    cbCurtab.disabled = true
    let cbPost = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    cbPost.parentElement.setAttribute('class', 'checkbox')
    cbPost.setAttribute('type', 'checkbox')
    if (v.isPost) cbPost.checked = true
    cbPost.disabled = true
    let delButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    delButton.setAttribute('class', 'btn')
    delButton.setAttribute('type', 'button')
    delButton.setAttribute('value', 'Del...')
    delButton.addEventListener('click', () => myConfirm(`Delete ${v.name}?`, (f) => {
      if (f) {
        options.searches.deleteEntry(v.name)
        elem['row' + v[0]].remove()
        elem.dirtyAlert.textContent = 'Change(s) may not be saved'
      }
    }))
    return tr
  }

  let init = () => {
    if (!g.isChrome) {
      [].slice.call(document.querySelectorAll('dialog')).forEach(x => dialogPolyfill.registerDialog(x))
    }
    elem.new.addEventListener('click', () => {
      initDetail()
      showDetail((f) => {
        if (f) {
          let v = fromDetail()
          options.searches.addEntry(v)
          elem.table.appendChild(createRow(v))
          elem.dirtyAlert.textContent = 'Change(s) may not be saved'
        }
      })
    })
    elem.newFromText.addEventListener('click', () => {
      showFromText((f) => {
        if (f) {
          const v = g.Conf.fromExternal([JSON.parse(elem.entry.value)])
          if (v instanceof Error) {
            myAlert('Invalid configuration', v.message)
          } else {
            options.searches.addEntry(v.conf[0])
            elem.table.appendChild(createRow(v.conf[0]))
            elem.dirtyAlert.textContent = 'Change(s) may not be saved'
          }
        }
      })
    })
    elem.save.addEventListener('click', saveOptions)
    elem.import.addEventListener('change', importOptions)
  }

  let restoreOptions = () => {
    g.browser.storage.sync.get('searches', function (res) {
      options = {}
      options.searches = g.Conf.fromStorage(res)
      options.init = true
      options.searches.conf.forEach(v => elem.table.appendChild(createRow(v)))
      // As of Chrome 65, the following bug blocks download from chrome extension popups
      // https://bugs.chromium.org/p/chromium/issues/detail?id=821219
      elem.export.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(options.searches.toExternal(), null, 2))
      elem.dirtyAlert.textContent = ''
    })
  }

  let setStatus = (message) => {
    elem.status.textContent = message
    setTimeout(() => { elem.status.textContent = '' }, 1500)
  }

  let importOptions = () => {
    const conf = elem.import.files[0]
    if (conf === '') return
    const url = window.URL.createObjectURL(conf)
    elem.import.value = ''
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'json'
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const searches = g.Conf.fromExternal(xhr.response)
        if (searches instanceof Error) {
          myAlert('Invalid configuration', searches.message)
        } else {
          g.browser.storage.sync.set({ searches: searches.toStorage() }, () => {
            setStatus('imported')
            const trs = [].slice.call(elem.table.children, 1)
            for (let tr of trs) {
              elem.table.removeChild(tr)
            }
            restoreOptions()
          })
        }
      }
    })
    xhr.send()
  }

  let saveOptions = () => {
    let options_ = Object.assign({}, options, options.searches.toStorage())
    g.browser.storage.sync.set(options_, () => {
      if (g.browser.runtime.lastError) {
        setStatus(g.browser.runtime.lastError.message)
      } else {
        setStatus('saved')
        elem.dirtyAlert.textContent = ''
      }
    })
  }

  let restoreConf = () => {
    g.browser.runtime.sendMessage({ command: 'queryOptionConf' }, v => {
      if (v !== null) {
        v = g.Conf.fromStorage({ searches: [v] }).conf[0]
        setDetailNew(v)
        showDetail((f) => {
          if (f) {
            let v = fromDetail()
            options.searches.addEntry(v)
            elem.table.appendChild(createRow(v))
            elem.dirtyAlert.textContent = 'Change(s) may not be saved'
          }
        })
      }
    })
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('DOMContentLoaded', restoreOptions)
  document.addEventListener('DOMContentLoaded', restoreConf)
})(g)
