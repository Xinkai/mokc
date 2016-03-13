"use strict";

const fs = require("fs");

const gulp = require("gulp");
const babel = require("gulp-babel");
const rollup = require("rollup-stream");
const sourcemaps = require("gulp-sourcemaps");
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const header = require("gulp-header");

const Paths = {
    jssrc: "src/**/*.js",
    htmlsrc: "src/**/*.html",

    dist: "dist/",
};

gulp.task("karma.conf.js", () => {
    return gulp.src("karma.conf.js")
               .pipe(gulp.dest(Paths.dist));
});

gulp.task("html", () => {
    return gulp.src(Paths.htmlsrc)
               .pipe(gulp.dest(Paths.dist));
});

gulp.task("symlink", () => {
    try {
        fs.symlinkSync(__dirname + "/node_modules/", __dirname + "/dist/node_modules");
    } catch (err) {
        if (err && err.code !== "EEXIST") {
            throw err;
        }
    }
});

// Firefox 45 doesn't allow for(const one of collection) {}, hence babel
const babelOptions = JSON.parse(fs.readFileSync(".babelrc", 'utf8'));

gulp.task("build:karma", ["karma.conf.js", "html", "symlink"], () => {
    return rollup({
        entry: 'src/test/entry.js',
        sourceMap: true,
    }).pipe(source('entry.js', './src/test'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(babel(babelOptions))
      .pipe(header(`"use strict";
// This file is bundled by gulp, see gulpfile.js at the root dir.
`))
      .pipe(sourcemaps.write(".")) // this only works if the sourceMap option is true
      .pipe(gulp.dest(Paths.dist + "test/"));
});

gulp.task("watch:karma", ["build:karma"], () => {
    gulp.watch(Paths.jssrc, ["build:karma"]);
});
