const express = require('express');
const router = express.Router();
const cors = require('cors');

const cheerio = require('cheerio');
const request = require('request');

router.use(cors());

router.get('/', (req, res) => {

    request({
        url: 'http://ncov.mohw.go.kr/bdBoardList_Real.do?brdId=1&brdGubun=13',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36'
        }
    }, (error, response, html) => {
        if (error) {
            console.log(error);
            // throw error;
        }
        const $ = cheerio.load(html);

        let data = [];
        const tr_list = $($('table')[0]).children("tbody").children("tr");

        // 행의 갯수만큼 반복 순회
        for (let row = 0; row < tr_list.length; row++) {
            const cells = tr_list.eq(row).children();
            const cols = [];

            // 열의 갯수만큼 반복 순회
            for (let column = 0; column < cells.length; column++) {
                const hero = cells.eq(column).text();
                cols.push(hero.replace(/[\{\}\[\]\s\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, ""));
            }
            data.push(cols);
        }
        // data 행렬 전치
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < i; j++) {
                const tmp = data[i][j];
                data[i][j] = data[j][i];
                data[j][i] = tmp;
            }
        }
        // 유효 data 추출
        data = data.splice(0, 6);

        // Response JSON Prototype
        let json = {
            'type': [],
            'increment': [],
            'total': [],
            'dead': [],
            'rate': [],
            'inspection': [],
            key: function (n) {
                return this[Object.keys(this)[n]];
            }
        };
        data.forEach((data_val, data_idx) => {
            data[data_idx].forEach((val, idx) => {
                json.key(data_idx).push(val);
            });
        });
        const infoDate = ($($('#content > div > div.timetable > p > span')[0]).text().replace(/[^0-9.]/g, '')).split('.');

        const cDate = new Date(2020, parseInt(infoDate[0]) - 1, parseInt(infoDate[1]));
        const mm = cDate.getMonth() + 1; // getMonth() is zero-based
        const dd = cDate.getDate();
        json.date = [cDate.getFullYear(),
            (mm > 9 ? '' : '0') + mm,
            (dd > 9 ? '' : '0') + dd
        ].join('');

        delete json['key'];

        // 질본 통계는 00시 기준이라 09시 기준을 가져오기 위해서 연합뉴스 크롤링
        request({
            url: 'https://www.yna.co.kr/',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36'
            }
        }, (error, response, html) => {
            const $ = cheerio.load(html);
            json.totalLast = $($('.count01 strong')[0]).text().replace(/[\{\}\[\]\s\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "");
            json.isolatedLast = $($('.count02 strong')[0]).text().replace(/[\{\}\[\]\s\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "");
            json.deadLast = $($('.count03 strong')[0]).text().replace(/[\{\}\[\]\s\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"]/gi, "");

            return res.json(json);
        });

    });
});


module.exports = router;