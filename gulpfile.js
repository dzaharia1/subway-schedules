const gulp = require('gulp'),
	sass = require('gulp-sass')(require('sass')),
	browserSync = require('browser-sync'),
	plumber = require('gulp-plumber'),
	reload = browserSync.reload;

const { series, parallel } = require('gulp');

const SOURCE = {
	scss: 'scss/**/*.scss',
	css: 'public/css',
	ejs: 'views/**/*.ejs',
	js: 'public/scripts/*.js',
	images: 'public/img/**/*'
};

function bsSync() {
	return browserSync({
		proxy: 'localhost:3333',
		notify: true,
		files: [SOURCE.js, SOURCE.ejs],
		open: false
	});
};

function bsReload() {
	return browserSync.reload();
}

function sassCompile() {
	return gulp.src(SOURCE.scss)
		.pipe(plumber())
		.pipe(sass())
		.pipe(gulp.dest(SOURCE.css))
		.pipe(reload({ stream: true }));
}

function watcher() {
	gulp.watch(SOURCE.scss, { ignoreInitial: false, queue: false }, sassCompile);
}

exports.default = parallel(bsSync, watcher);

// var gulp = require('gulp') ,
// sass = require('gulp-sass') ,
// scsslint = require('gulp-scss-lint') ,
// autoprefixer = require('gulp-autoprefixer') ,
// browserSync = require('browser-sync') ,
// plumber = require('gulp-plumber') ,
// reload = browserSync.reload;

// var SOURCE = {
// 	scss: 'scss/**/*.scss',
// 	css: 'public/css',
// 	ejs: 'views/**/*.ejs',
// 	js: ['/*.js', 'public/scripts/*.js'],
// 	images: 'public/images/icon-library/svg/*'
// };

// // var dest = {
// // 	data: 'data'
// // };

// var AUTOPREFIXER_BROWSERS = [
// 'ie >= 10',
// 'ie_mob >= 10',
// 'ff >= 30',
// 'chrome >= 34',
// 'safari >= 7',
// 'opera >= 23',
// 'ios >= 7',
// 'android >= 4.4',
// 'bb >= 10'
// ];

// gulp.task('browser-sync', function(){
// 	browserSync({
// 		proxy: 'localhost:3333',
// 		notify: false
// 	});
// });

// gulp.task('bs-reload', function(){
// 	browserSync.reload();
// });

// gulp.task('scss-lint', function(){
// 	gulp.src('/' + SOURCE.js)
// 	.pipe(scsslint());
// });

// gulp.task('sass', ['scss-lint'], function () {
// 	gulp.src(SOURCE.scss)
// 	.pipe(plumber())
// 	.pipe(sass())
// 	.pipe(autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
// 	.pipe(gulp.dest(SOURCE.css))
// 	.pipe(reload({stream:true}));
// });

// gulp.task('default', ['sass', 'browser-sync'], function(){
// 	gulp.watch(SOURCE.scss, ['sass']);
// 	gulp.watch([SOURCE.ejs, SOURCE.js], ['bs-reload']);
// });
