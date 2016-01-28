var log = console.log;
var needle = require('needle');
var async = require('async');
var caba = require('caba')();
var fs = require('fs');
var oopt = require('oopt')('e:p:f:');

var words = (oopt.f && fs.existsSync(oopt.f)) ? (fs.readFileSync(oopt.f, 'utf-8')).split('\n') : [];
words = oopt._ ? words.concat(oopt._) : words;

if (words.length === 0) {
    log('No words to add');
    process.exit(1);
}

if (!oopt.e) {
    log('Need email to auth');
    process.exit(2);
}

if (!oopt.p) {
    log('Need password to auth');
    process.exit(3);
}

var options = {};
var data = {
    email: oopt.e,
    password: oopt.p
};

needle.post('http://lingualeo.com/ru/login', data, function(err, resp) {
    if(resp.statusCode === 200){
        log('Bad auth');
        process.exit();
    }
    options.cookies = resp.cookies;
    needle.get('http://lingualeo.com/ru', options, function(err, resp) {
        for (var key in resp.cookies){
                options.cookies[key] = resp.cookies[key];
        }
        options.headers = {'x-requested-With': 'XMLHttpRequest'};
        caba.start('%s tasks done.');
        async.eachSeries(words, function(word, CB){
            needle.get('http://lingualeo.com/userdict3/getTranslations?word_value=' + word.replace(' ', '+'), options, function(err, resp) {
                if(err || resp.body.error_msg){
                    caba.log(err || resp.body.error_msg + ' :: ' + word);
                    return CB();
                }
                async.eachSeries(resp.body.userdict3.translations, function(item, cb){
                    data = {
                        word_id: resp.body.userdict3.word_id,
                        speech_part_id: 0,
                        groupId: 'dictionary',
                        translate_id: item.translate_id,
                        translate_value: item.translate_value,
                        user_word_value: word,
                        from_syntrans_id: '',
                        to_syntrans_id: ''
                    };
                    needle.post('http://lingualeo.com/userdict3/addWord', data, options, function(err, resp) {
                        cb();
                    });
                }, function(err){
                    caba.step();
                    CB();
                });
            });
        }, function(err){
            caba.finish();
            log(err || 'Finished!');
        });
    });
});