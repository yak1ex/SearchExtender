(function () {
  'use strict'

  /* global chrome */
  // TODO: import/export feature

  let options

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
    ;['omnibox', 'page', 'selection', 'link', 'image'].forEach(id => { document.getElementById(id).checked = false })
    document.getElementById('key').value = ''
    document.getElementById('query').value = ''
  }

  let setDetail = v => {
    document.getElementById('update').value = 'Update'
    document.getElementById('heading').textContent = 'Edit search config'
    document.getElementById('name').value = v[0]
    ;[['omnibox', 1], ['page', 2], ['selection', 4], ['link', 8], ['image', 16]].forEach(vv => { document.getElementById(vv[0]).checked = ((v[1] & vv[1]) !== 0) })
    document.getElementById('key').value = v[2]
    document.getElementById('query').value = v[3]
  }

  let fromDetail = () => {
    return [
      document.getElementById('name').value,
      [['omnibox', 1], ['page', 2], ['selection', 4], ['link', 8], ['image', 16]].reduce((acc, vv) => acc + (document.getElementById(vv[0]).checked ? vv[1] : 0), 0),
      document.getElementById('key').value,
      document.getElementById('query').value,
      false // FIXME
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
    for (let j of [1, 2, 4, 8, 16]) {
      let cb = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
      cb.setAttribute('type', 'checkbox')
      if (v[1] & j) cb.checked = true
      cb.disabled = true
    }
    tr.appendChild(document.createElement('td')).innerText = v[2]
    tr.appendChild(document.createElement('td')).innerText = v[3]
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

  let restoreOptions = () => {
    chrome.storage.sync.get('searches', function (res) {
      options = res
      options.init = true
      for (let i = 0; i < options.searches.length; ++i) {
        let v = options.searches[i]
        document.getElementById('table').appendChild(createRow(v))
      }
    })
  }

  let saveOptions = () => {
    chrome.storage.sync.set(options, () => {
      document.getElementById('status').textContent = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'saved'
      setTimeout(() => { document.getElementById('status').textContent = '' }, 750)
    })
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('DOMContentLoaded', restoreOptions)
  document.getElementById('save').addEventListener('click', saveOptions)
})()
