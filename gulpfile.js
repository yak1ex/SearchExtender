const gulp = require('gulp')
const rename = require('gulp-rename')
const pug = require('gulp-pug')

function process (type) {
  if (type !== 'firefox' && type !== 'chrome') return
  gulp.src('*.html').pipe(gulp.dest(type))
  gulp.src(['*.js', '!gulpfile.js']).pipe(gulp.dest(type))
  gulp.src('*.pug').pipe(pug({ locals: { [type]: true } })).pipe(gulp.dest(type))
  if (type === 'firefox') gulp.src('node_modules/dialog-polyfill/dialog-polyfill.*').pipe(rename({ dirname: '' })).pipe(gulp.dest(type))
  return gulp.src(`manifest.${type}.json`).pipe(rename('manifest.json')).pipe(gulp.dest(type))
}

gulp.task('firefox', function () {
  return process('firefox')
})

gulp.task('chrome', function () {
  return process('chrome')
})

gulp.task('default', gulp.parallel('firefox', 'chrome'))
