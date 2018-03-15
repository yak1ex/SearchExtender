const gulp = require('gulp')
const rename = require('gulp-rename')
const pug = require('gulp-pug')

gulp.task('default', function () {
  gulp.src('*.html').pipe(gulp.dest('chrome')).pipe(gulp.dest('firefox'))
  gulp.src(['*.js', '!gulpfile.js']).pipe(gulp.dest('chrome')).pipe(gulp.dest('firefox'))
  gulp.src('*.pug').pipe(pug({ locals: { chrome: true } })).pipe(gulp.dest('chrome'))
  gulp.src('*.pug').pipe(pug({ locals: { firefox: true } })).pipe(gulp.dest('firefox'))
  gulp.src('node_modules/dialog-polyfill/dialog-polyfill.*').pipe(rename({ dirname: '' })).pipe(gulp.dest('firefox'))
  gulp.src('manifest.chrome.json').pipe(rename('manifest.json')).pipe(gulp.dest('chrome'))
  gulp.src('manifest.firefox.json').pipe(rename('manifest.json')).pipe(gulp.dest('firefox'))
})
