(function() {
  'use strict'

  var restoreOptions = function () {
    chrome.storage.sync.get('searches', function (res) {
      for (let v of res.searches) {
        let tr = document.createElement('tr')
        let editButton = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
        editButton.setAttribute('type', 'button')
        editButton.setAttribute('value', 'Edit...')
        tr.appendChild(document.createElement('td')).innerText = v[0]
        for (let i of [1,2,4,8,16]) {
          let cb = tr.appendChild(document.createElement('td')).appendChild(document.createElement('input'))
          db.setAttribute('type', 'checkbox')
        }
        tr.appendChild(document.createElement('td')).innerText = v[2]
        tr.appendChild(document.createElement('td')).innerText = v[3]
        document.getElementById('table').appendChild(tr)
      }
    })
  }

  document.addEventListener('DOMContentLoaded', restoreOptions)
})()
