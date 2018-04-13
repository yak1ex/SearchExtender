(function () {
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

  const targetKeyVal = [['omnibox', 1], ['page', 2], ['selection', 4], ['link', 8], ['image', 16]]
  const targetKey = targetKeyVal.map(x => x[0])
  const targetVal = targetKeyVal.map(x => x[1])

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
    if (v[0] === '') return 'Empty name'
    if (v[0] !== curname && options.searches.map(x => x[0]).indexOf(v[0]) !== -1) return `name: '${v[0]}' is already used`
    if (v[2] !== '' && v[2] !== curkey && options.searches.map(x => x[2]).indexOf(v[2]) !== -1) return `key: '${v[2]}' is already used`
    if (v[3] === '') return 'Empty query'
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
    targetKey.forEach(id => { elem[id].checked = false })
    elem.key.value = ''
    elem.key.setAttribute('data-current', '')
    elem.query.value = ''
    elem.curtab.checked = false
    elem.post.checked = false
  }

  let setDetail = v => {
    elem.update.value = 'Update'
    elem.heading.textContent = 'Edit search config'
    elem.name.value = v[0]
    elem.name.setAttribute('data-current', v[0])
    targetKeyVal.forEach(vv => { elem[vv[0]].checked = ((v[1] & vv[1]) !== 0) })
    elem.key.value = v[2]
    elem.key.setAttribute('data-current', v[2])
    elem.query.value = v[3]
    elem.curtab.checked = v[4]
    elem.post.checked = v[5]
  }

  let fromDetail = () => {
    return [
      elem.name.value,
      targetKeyVal.reduce((acc, vv) => acc + (elem[vv[0]].checked ? vv[1] : 0), 0),
      elem.key.value,
      elem.query.value,
      elem.curtab.checked,
      elem.post.checked
    ]
  }

  let showFromText = (cb) => {
    let cbTrue, cbFalse
    let makeCb = (f) => (e) => {
      if (f) {
        const v = fromExports([JSON.parse(elem.entry.value)])
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
    tr.id = 'row' + v[0]
    let editButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    editButton.setAttribute('type', 'button')
    editButton.setAttribute('value', 'Edit...')
    editButton.addEventListener('click', () => {
      setDetail(v)
      showDetail(f => {
        if (f) {
          let newV = fromDetail()
          options.searches.splice(options.searches.findIndex(vv => vv[0] === v[0]), 1, newV)
          elem.table.replaceChild(createRow(newV), tr)
        }
      })
    })
    tr.appendChild(document.createElement('td')).innerText = v[0]
    for (let j of targetVal) {
      let cb = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
      cb.setAttribute('type', 'checkbox')
      if (v[1] & j) cb.checked = true
      cb.disabled = true
    }
    tr.appendChild(document.createElement('td')).innerText = v[2]
    tr.appendChild(document.createElement('td')).innerText = v[3]
    let cbCurtab = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    cbCurtab.setAttribute('type', 'checkbox')
    if (v[4]) cbCurtab.checked = true
    cbCurtab.disabled = true
    let cbPost = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    cbPost.setAttribute('type', 'checkbox')
    if (v[5]) cbPost.checked = true
    cbPost.disabled = true
    let delButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    delButton.setAttribute('type', 'button')
    delButton.setAttribute('value', 'Del...')
    delButton.addEventListener('click', () => myConfirm(`Delete ${v[0]}?`, (f) => {
      if (f) {
        options.searches.splice(options.searches.findIndex(vv => vv[0] === v[0]), 1)
        elem['row' + v[0]].remove()
      }
    }))
    return tr
  }

  let init = () => {
    if (!browser.isChrome) {
      [].slice.call(document.querySelectorAll('dialog')).forEach(x => dialogPolyfill.registerDialog(x))
    }
    elem.new.addEventListener('click', () => {
      initDetail()
      showDetail((f) => {
        if (f) {
          let v = fromDetail()
          options.searches.push(v)
          elem.table.appendChild(createRow(v))
        }
      })
    })
    elem.newFromText.addEventListener('click', () => {
      showFromText((f) => {
        if (f) {
          const v = fromExports([JSON.parse(elem.entry.value)])
          if (v instanceof Error) {
            myAlert('Invalid configuration', v.message)
          } else {
            options.searches.push(v[0])
            elem.table.appendChild(createRow(v[0]))
          }
        }
      })
    })
    elem.save.addEventListener('click', saveOptions)
    elem.import.addEventListener('change', importOptions)
  }

  let makeExports = (searches) => {
    let result = []
    for (let v of searches) {
      let target = {}
      for (let kv of targetKeyVal) {
        if (v[1] & kv[1]) target[kv[0]] = true
      }
      result.push([v[0], target, v[2], v[3], v[4], v[5]])
    }
    return JSON.stringify(result, null, 2)
  }

  let fromExports = (searches) => {
    let results = []
    if (searches === null) return new Error('Invalid JSON')
    if (!(searches instanceof Array)) return new Error('root is not an array')
    try {
      searches.forEach((v, idx) => {
        if (!(v instanceof Array) || v.length !== 6) throw new Error(`The ${idx + 1}-th entry is not a 6-element array`)
        if (typeof v[1] !== 'object') throw new Error(`The 2nd element of ${idx + 1}-th entry is not an object`)
        const unknown = Object.keys(v[1]).filter(x => targetKey.indexOf(x) === -1)
        if (unknown.length !== 0) throw new Error(`unknown key ${unknown.join(', ')} is used in ${idx + 1}-th entry`)
        let bits = 0
        for (let kv of targetKeyVal) {
          if (kv[0] in v[1]) bits += kv[1]
        }
        results.push([v[0], bits, v[2], v[3], v[4], v[5]])
      })
    } catch (e) {
      return e
    }
    return results
  }

  let restoreOptions = () => {
    browser.storage.sync.get('searches', function (res) {
      options = res
      options.init = true
      for (let i = 0; i < options.searches.length; ++i) {
        let v = options.searches[i]
        elem.table.appendChild(createRow(v))
      }
      // As of Chrome 65, the following bug blocks download from chrome extension popups
      // https://bugs.chromium.org/p/chromium/issues/detail?id=821219
      elem.export.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(makeExports(options.searches))
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
        const searches = fromExports(xhr.response)
        if (searches instanceof Error) {
          myAlert('Invalid configuration', searches.message)
        } else {
          browser.storage.sync.set({ searches }, () => {
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
    browser.storage.sync.set(options, () => setStatus(browser.runtime.lastError ? browser.runtime.lastError.message : 'saved'))
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('DOMContentLoaded', restoreOptions)
})()
