const gulp = require('gulp')
const rename = require('gulp-rename')
const pug = require('gulp-pug')
const concat = require('gulp-concat')
const insert = require('gulp-insert')
const merge = require('merge-stream')

function concatjs(src, dest) {
  return gulp.src(src)
    .pipe(insert.prepend(';'))
    .pipe(concat(dest))
    .pipe(insert.wrap('(function(){\nlet g = {}\n', '})()\n'))
}

['multiua.part.js', 'background.part.js']
'background.js'

function process (type) {
  if (type !== 'firefox' && type !== 'chrome') return
  let src = []
  src.push(gulp.src('*.html'))
  src.push(concatjs(['multiua.part.js', 'background.part.js'], 'background.js'))
  src.push(concatjs(['multiua.part.js', 'extract.part.js'], 'extract.js'))
  src.push(concatjs(['multiua.part.js', 'options.part.js'], 'options.js'))
  src.push(concatjs(['multiua.part.js', 'poster.part.js'], 'poster.js'))
  src.push(gulp.src('*.pug').pipe(pug({ locals: { [type]: true } })))
  if (type === 'firefox') {
    src.push(gulp.src('node_modules/dialog-polyfill/dialog-polyfill.*').pipe(rename({ dirname: '' })))
  }
  src.push(gulp.src(`manifest.${type}.json`).pipe(rename('manifest.json')))
  return merge().add(src).pipe(gulp.dest(type))
}

gulp.task('firefox', function () {
  return process('firefox')
})

gulp.task('chrome', function () {
  return process('chrome')
})

gulp.task('default', gulp.parallel('firefox', 'chrome'))
