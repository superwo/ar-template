const pathModule = require('path');

// Change the name of the theme folder, local url and remote url
let project_folder = '../test';
let siteUrl = 'http://testtemplate.local/';
let remoteUrl = 'www.example.com';

let theme_assets_folder = pathModule.join(project_folder, '/assets');
let source_folder = pathModule.join(project_folder, '/#src');

let fs = require('fs');

const vendorsScripts = ['node_modules/svg4everybody/dist/svg4everybody.min.js'];

let path = {
  build: {
    php: project_folder + '/',
    css: theme_assets_folder + '/css/',
    js: theme_assets_folder + '/js/',
    img: theme_assets_folder + '/img/',
    fonts: theme_assets_folder + '/fonts/',
  },
  src: {
    // html: [source_folder + '/*.html', '!' + source_folder + '/_*.html'],
    php: [project_folder + '/**/*.php'],
    css: source_folder + '/_scss/style.scss',
    js: source_folder + '/_js/script.js',
    img: source_folder + '/_img/**/*.{jpg,png,svg,gif,ico,webp}',
    fonts: source_folder + '/_fonts/*.ttf',
  },
  watch: {
    // html: source_folder + '/**/*.html',
    php: project_folder + '/**/*.php',
    css: source_folder + '/_scss/**/*.scss',
    js: source_folder + '/_js/**/*.js',
    img: source_folder + '/_img/**/*.{jpg,png,svg,gif,ico,webp}',
  },
  clean: './' + theme_assets_folder + '/',
};

let { src, dest } = require('gulp'),
  gulp = require('gulp'),
  browsersync = require('browser-sync').create(),
  fileinclude = require('gulp-file-include'),
  del = require('del'),
  scss = require('gulp-sass'),
  autoprefixer = require('gulp-autoprefixer'),
  clean_css = require('gulp-clean-css'),
  group_media = require('gulp-group-css-media-queries'),
  rename = require('gulp-rename'),
  babel = require('gulp-babel'),
  svgSprite = require('gulp-svg-sprite'),
  svgmin = require('gulp-svgmin'),
  cheerio = require('gulp-cheerio'),
  replace = require('gulp-replace'),
  ttf2woff = require('gulp-ttf2woff'),
  ttf2woff2 = require('gulp-ttf2woff2'),
  uglify = require('gulp-uglify-es').default,
  concat = require('gulp-concat');
fonter = require('gulp-fonter');

function browserSync(params) {
  browsersync.init({
    proxy: {
      target: siteUrl,
      ws: true,
    },
    reloadDelay: 900,
  });
  // gulp.watch(project_folder + '**/*.php').on('change', browserSync.reload);
  // done();
  // browsersync.init({
  //   server: {
  //     baseDir: './' + project_folder + '/',
  //   },
  //   port: 3000,
  //   notify: false,
  // });
}

function php() {
  return src(path.src.php).pipe(browsersync.stream());
}

function css() {
  return src(path.src.css)
    .pipe(
      scss({
        outputStyle: 'expanded',
      })
    )
    .pipe(group_media())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ['last 5 versions'],
        cascade: true,
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream())
    .pipe(clean_css())
    .pipe(
      rename({
        extname: '.min.css',
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
}

function js() {
  return src(path.src.js)
    .pipe(fileinclude())
    .pipe(
      babel({
        presets: ['@babel/env'],
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream())
    .pipe(uglify())
    .pipe(
      rename({
        extname: '.min.js',
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

function vendors(cb) {
  return vendorsScripts.length
    ? gulp
        .src(vendorsScripts)
        .pipe(concat('libs.js'))
        .pipe(gulp.dest(path.build.js))
    : cb();
}

function images() {
  return src(path.src.img)
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
}

function fonts() {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
  return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

gulp.task('otf2ttf', function () {
  return src([source_folder + '/fonts/*.otf'])
    .pipe(
      fonter({
        formats: ['ttf'],
      })
    )
    .pipe(dest(source_folder + '/fonts/'));
});

gulp.task('svgSprite', function () {
  return (
    gulp
      .src([source_folder + '/iconsprite/*.svg'])
      // minify svg
      .pipe(
        svgmin({
          js2svg: {
            pretty: true,
          },
        })
      )
      // remove all fill, style and stroke declarations in out shapes
      .pipe(
        cheerio({
          run: function ($) {
            $('[fill]').removeAttr('fill');
            $('[stroke]').removeAttr('stroke');
            $('[style]').removeAttr('style');
          },
          parserOptions: { xmlMode: true },
        })
      )
      // cheerio plugin create unnecessary string '&gt;', so replace it.
      .pipe(replace('&gt;', '>'))
      // build svg sprite
      .pipe(
        svgSprite({
          mode: {
            symbol: {
              sprite: '../icons/icons.svg', // sprite file name
              // example: true,
            },
          },
        })
      )
      .pipe(dest(path.build.img))
  );
});

function fontsStyle() {
  let file_content = fs.readFileSync(source_folder + '/_scss/utils/fonts.scss');
  if (file_content == '') {
    fs.writeFile(source_folder + '/_scss/fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(
              source_folder + '/_scss/utils/fonts.scss',
              '@include font("' +
                fontname +
                '", "' +
                fontname +
                '", "400", "normal");\r\n',
              cb
            );
          }
          c_fontname = fontname;
        }
      }
    });
  }
}

function cb() {}

function watchFiles() {
  gulp.watch([path.watch.php], php);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.img], images);
}

function clean() {
  return del(path.clean, { force: true });
}

let build = gulp.series(
  clean,
  gulp.parallel(images, js, vendors, css, php, fonts),
  fontsStyle
);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.vendors = vendors;
exports.css = css;
exports.php = php;
exports.build = build;
exports.watch = watch;
exports.default = watch;
