const gulp = require('gulp')
const rename = require('gulp-rename')

gulp.task('default', function() {
  gulp.src('*.html').pipe(gulp.dest('chrome'))
  gulp.src('*.js').pipe(gulp.dest('chrome'))
  gulp.src('*.html').pipe(gulp.dest('firefox'))
  gulp.src('*.js').pipe(gulp.dest('firefox'))
  gulp.src('manifest.chrome.json').pipe(rename('manifest.json')).pipe(gulp.dest('chrome'))
  gulp.src('manifest.firefox.json').pipe(rename('manifest.json')).pipe(gulp.dest('firefox'))
})
