(function () {
  'use strict'

  /* global chrome */
  // TODO: Use contentEditable feature
  // TODO: Call getElementById() at one place

  let options

  const targetKeyVal = [['omnibox', 1], ['page', 2], ['selection', 4], ['link', 8], ['image', 16]]
  const targetKey = targetKeyVal.map(x => x[0])
  const targetVal = targetKeyVal.map(x => x[1])

  let myAlert = (title, message) => {
    document.getElementById('alertTitle').textContent = title
    document.getElementById('alertMessage').textContent = message
    document.getElementById('alert').showModal()
  }

  let myConfirm = (message, cb) => {
    document.getElementById('confirmMessage').textContent = message
    let cbTrue, cbFalse
    let makeCb = (f) => () => {
      document.getElementById('confirmConfirm').removeEventListener('click', cbTrue)
      document.getElementById('cancelConfirm').removeEventListener('click', cbFalse)
      document.getElementById('confirm').close()
      cb(f)
    }
    cbTrue = makeCb(true)
    cbFalse = makeCb(false)
    document.getElementById('confirmConfirm').addEventListener('click', cbTrue)
    document.getElementById('cancelConfirm').addEventListener('click', cbFalse)
    document.getElementById('confirm').showModal()
  }

  // FIXME: sanity check
  let showDetail = (cb) => {
    let cbTrue, cbFalse
    let makeCb = (f) => () => {
      document.getElementById('update').removeEventListener('click', cbTrue)
      document.getElementById('cancel').removeEventListener('click', cbFalse)
      document.getElementById('detail').close()
      cb(f)
    }
    cbTrue = makeCb(true)
    cbFalse = makeCb(false)
    document.getElementById('update').addEventListener('click', cbTrue)
    document.getElementById('cancel').addEventListener('click', cbFalse)
    document.getElementById('detail').showModal()
  }

  let initDetail = () => {
    document.getElementById('update').value = 'Add'
    document.getElementById('heading').textContent = 'New search config'
    document.getElementById('name').value = ''
    document.getElementById('omnibox').checked = false
    targetKey.forEach(id => { document.getElementById(id).checked = false })
    document.getElementById('key').value = ''
    document.getElementById('query').value = ''
    document.getElementById('curpage').checked = false
  }

  let setDetail = v => {
    document.getElementById('update').value = 'Update'
    document.getElementById('heading').textContent = 'Edit search config'
    document.getElementById('name').value = v[0]
    targetKeyVal.forEach(vv => { document.getElementById(vv[0]).checked = ((v[1] & vv[1]) !== 0) })
    document.getElementById('key').value = v[2]
    document.getElementById('query').value = v[3]
    document.getElementById('curpage').value = v[4]
  }

  let fromDetail = () => {
    return [
      document.getElementById('name').value,
      targetKeyVal.reduce((acc, vv) => acc + (document.getElementById(vv[0]).checked ? vv[1] : 0), 0),
      document.getElementById('key').value,
      document.getElementById('query').value,
      document.getElementById('curpage').checked
    ]
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
          document.getElementById('table').replaceChild(createRow(newV), tr)
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
    let cbCurpage = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    cbCurpage.setAttribute('type', 'checkbox')
    if (v[4]) cbCurpage.checked = true
    cbCurpage.disabled = true
    let delButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
    delButton.setAttribute('type', 'button')
    delButton.setAttribute('value', 'Del...')
    delButton.addEventListener('click', () => myConfirm(`Delete ${v[0]}?`, (f) => {
      if (f) {
        options.searches.splice(options.searches.findIndex(vv => vv[0] === v[0]), 1)
        document.getElementById('row' + v[0]).remove()
      }
    }))
    return tr
  }

  let init = () => {
    document.getElementById('new').addEventListener('click', () => {
      initDetail()
      showDetail((f) => {
        if (f) {
          let v = fromDetail()
          options.searches.push(v)
          document.getElementById('table').appendChild(createRow(v))
        }
      })
    })
  }

  let makeExports = (searches) => {
    let result = []
    for (let v of searches) {
      let target = {}
      for (let kv of targetKeyVal) {
        if (v[1] & kv[1]) target[kv[0]] = true
      }
      result.push([v[0], target, v[2], v[3], v[4]])
    }
    return JSON.stringify(result, null, 2)
  }

  let fromExports = (searches) => {
    let results = []
    if (searches === null) return new Error('Invalid JSON')
    if (!(searches instanceof Array)) return new Error('root is not an array')
    try {
      searches.forEach((v, idx) => {
        if (!(v instanceof Array) || v.length !== 5) throw new Error(`The ${idx+1}-th entry is not a 5-element array`)
        if (typeof v[1] !== 'object') throw new Error(`The 2nd element of ${idx+1}-th entry is not an object`)
        const unknown = Object.keys(v[1]).filter(x => targetKey.indexOf(x) === -1)
        if (unknown.length !== 0) throw new Error(`unknown key ${unknown.join(', ')} is used in ${idx+1}-th entry`)
        let bits = 0
        for (let kv of targetKeyVal) {
          if (kv[0] in v[1]) bits += kv[1]
        }
        results.push([v[0], bits, v[2], v[3], v[4]])
      })
    } catch(e) {
      return e
    }
    return results
  }

  let restoreOptions = () => {
    chrome.storage.sync.get('searches', function (res) {
      options = res
      options.init = true
      for (let i = 0; i < options.searches.length; ++i) {
        let v = options.searches[i]
        document.getElementById('table').appendChild(createRow(v))
      }
      document.getElementById('export').href = 'data:text/json;charset=utf-8,' + encodeURIComponent(makeExports(options.searches))
    })
  }

  let setStatus = (message) => {
    document.getElementById('status').textContent = message
    setTimeout(() => { document.getElementById('status').textContent = '' }, 1500)
  }

  let importOptions = () => {
    const conf = document.getElementById('import').files[0]
    if (conf === "") return
    const url = window.URL.createObjectURL(conf)
    document.getElementById('import').value = ''
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'json'
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const searches = fromExports(xhr.response)
        if (searches instanceof Error) {
          myAlert('Invalid configuration', searches.message)
        } else {
          chrome.storage.sync.set({ searches }, () => {
            setStatus('imported')
            const trs = [].slice.call(document.getElementById('table').children, 1)
            for (let tr of trs) {
              document.getElementById('table').removeChild(tr)
            }
            restoreOptions()
          })
        }
      }
    })
    xhr.send()
  }

  let saveOptions = () => {
    chrome.storage.sync.set(options, () => setStatus(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'saved'))
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('DOMContentLoaded', restoreOptions)
  document.getElementById('save').addEventListener('click', saveOptions)
  document.getElementById('import').addEventListener('change', importOptions)
})()
