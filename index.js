import chai from "chai";
import chai_http from "chai-http";
import path, { resolve } from "path";
import csvtojson from "csvtojson";
import logger from "./logger.js";
import readFiles from "./readcsvfile.js";
import Dotenv from "dotenv";
import converter from "json-2-csv";
import fs from "fs";
import dayjs from "dayjs";

let expect = chai.expect;
dayjs();
Dotenv.config();
chai.should();
chai.use(chai_http);

//		11	서울특별시
//		26	부산광역시
//		27	대구광역시
//		28	인천광역시
//		29	광주광역시
//		30	대전광역시
//		31	울산광역시
//		36	세종특별자치시
//		41	경기도
//		42	강원도
//		43	충청북도
//		44	충청남도
//		45	전라북도
//		46	전라남도
//		47	경상북도
//		48	경상남도
//		50	제주특별자치도

const AREA_NAME = {
  SEOUL: "서울특별시",
  INCHEON: "인천광역시",
  GYEONGIDO: "경기도",
  BUSAN: "부산광역시",
  DEAGU: "대구광역시",
  GWANGJU: "광주광역시",
  DAEJEON: "대전광역시",
  ULSAN: "울산광역시",
  SEJONG: "세종특별자치시",
  GANGWONDO: "강원도",
  CHUNGCHEONGBUKDO: "충청북도",
  CHOUNGCHEONGNAMDO: "충청남도",
  JEOLLABUKDO: "전라북도",
  JEOLLANAMDO: "전라남도",
  GYEONGSANGBUKDO: "경상북도",
  GYEONGSANGNAMDO: "경상남도",
  JEJUDO: "제주특별자치도",
};

const SIDO_CODE = {
  SEOUL: "11",
  INCHEON: "28",
  GYEONGIDO: "41",
  BUSAN: "26",
  DEAGU: "27",
  GWANGJU: "29",
  DAEJEON: "30",
  ULSAN: "31",
  SEJONG: "36",
  GANGWONDO: "42",
  CHUNGCHEONGBUKDO: "43",
  CHOUNGCHEONGNAMDO: "44",
  JEOLLABUKDO: "45",
  JEOLLANAMDO: "46",
  GYEONGSANGBUKDO: "47",
  GYEONGSANGNAMDO: "48",
  JEJUDO: "50",
};

const __dirname = path.resolve();

function IsJsonString(str) {
  try {
    var json = JSON.parse(str);
    return (typeof json === 'object');
  } catch (e) {
    return false;
  }
}


let processFile = async (filepath, name, ext, stat) => {
  csvtojson()
    .fromFile(filepath)
    .then(async (json) => {
      let resultjsonfile = json.filter((item) => {
        return item.RESULT.toString().slice(0, 2) === "41";
      });
      let json_req_report = new Array();

      let resultArray = Array.from(resultjsonfile);
      let zscodeTotalCnt = 0;
      logger.info("FILENAME" + name);
      for (let item of resultArray) {
        try {

          let result = await chai
            .request(process.env.GOVDATA_API_URL)
            .get("/getChargerInfo")
            .set("X-Requested-With", "")
            .set("Accept-Encoding", "gzip")
            .set("Origin", "https://127.0.0.1:10000")
            .query({
              serviceKey: process.env.GOV_STATION_API_SERVICEKEY_RAW,
              pageNo: "1",
              numOfRows: "9999",
              zcode: item.RESULT.toString().slice(0, 2),
              zscode: item.RESULT.toString(),
              dataType: "JSON",
            })
            .send();

          if (result.text && !IsJsonString(result.text)) {
            logger.error("XML FILE ERROR" + result.text);
            throw new Error("XML FIlE");
          }
          let json_result = JSON.parse(result.text);

          //json_result.should.be.json;
          //expect(json_result).to.have.status(200);
          zscodeTotalCnt += Number(json_result.totalCount);

          let json_req_report_item = new Object();
          json_req_report_item.SIDONAME = item.NAME_LONG;
          json_req_report_item.ZSCODE = item.RESULT;
          json_req_report_item.ZCODE = item.RESULT.toString().slice(0, 2);
          json_req_report_item.COUNT = Number(json_result.totalCount);

          json_req_report.push(json_req_report_item);

          logger.info(zscodeTotalCnt);
          logger.info("TOTALCOUNT:" + JSON.stringify(json_result.totalCount, true, 2));
          logger.info("ZCODE:" + item.RESULT.toString().slice(0, 2));
          logger.info("ZSCODE:" + item.RESULT.toString());
        } catch (err) {
          console.log(err);
          logger.error("error in request chai ");
          throw new Error(err);
        } finally {
        }
      }
      console.log(JSON.stringify(json_req_report, true, 2));
      let zcode = resultArray[0].RESULT.toString().slice(0, 2);

      let sidoresult = await chai
        .request(process.env.GOVDATA_API_URL)
        .get("/getChargerInfo")
        .set("X-Requested-With", "")
        .set("Origin", "https://127.0.0.1:10000")
        .query({
          serviceKey: process.env.GOV_STATION_API_SERVICEKEY_RAW,
          pageNo: "1",
          numOfRows: "9999",
          zcode: zcode,
          //zscode: item.RESULT.toString(),
          dataType: "JSON",
        }).send();


      expect(sidoresult).to.have.status(200);
      sidoresult.should.be.json;

      json_req_report[0].COUNT = JSON.stringify(JSON.parse(sidoresult.text).totalCount);

      console.log("------------zcode----------------");
      console.log("zcode: ", zcode);
      console.log(JSON.stringify(JSON.parse(sidoresult.text).totalCount, true, 2));
      console.log("------------zcode----------------");


      setTimeout(() => {
        console.log(resultArray);
      }, 1000);

      converter.json2csv(json_req_report, (err, csv) => {
        if (err) {
          console.log(err);
          throw err;
        }

        // print CSV string
        console.log(csv);

        // write CSV to a file
        //\uFEFF is for Korea Encoded Excel file (BOM)
        fs.writeFileSync(
          `./sidocode/testresult/${name.toString()}_${dayjs().format("YYYYMMDD_hh:mm")}.csv`,
          "\uFEFF" + csv,
          "utf8"
        );
      });
    });
};

describe("Proxy Server SSL certification process disabled..", function () {
  it("it should get a response 200", (done) => {
    chai
      .request("https://192.168.0.132:8080")
      .get("/")
      .end((err, res) => {
        //console.log(JSON.stringify(res));
        expect(res).to.have.status(200);
        res.should.be.text;
        done();
      });
  });
});

describe("CSV file should be loaded..", function () {
  this.timeout(0);
  it("CSV file loaded succesfully..", async (done) => {
    let sidoFileList = await readFiles(
      path.join(__dirname, "/sidocode"),
      processFile
    );
    resolve();
  });
});

// describe("/evCharger", function () {
//   it("it should get a response 200", (done) => {
//     chai
//       .request(
//         process.env.PROXY_URL.concat(
//           ":",
//           process.env.PROXY_PORT,
//           "/",
//           process.env.GOVDATA_API_URL
//         )
//       )
//       .get("/getChargerInfo")
//       .set("X-Requested-With", "")
//       .set("Origin", "https://127.0.0.1:10000")
//       .query({
//         serviceKey: "6xRQnrjN8tP1OCFN2XwFmXQRGETDSAsUkfYJKTQj6XfS14mKv+MJ2kPw37hotNyPCE80HYZHOd/wYEk5BGdDEQ==",
//         pageNo: "1",
//         numOfRows: "9999",
//         zcode: "11",
//         zscode: "11680",
//         dataType: "JSON"
//       })
//       .end((err, res) => {
//         //console.log(JSON.stringify(res));
//         if (err) { done(err); }
//         expect(res).to.have.status(200);
//         res.should.be.json;
//         console.log(JSON.stringify(JSON.parse(res.text).totalCount, true, 2));
//         done();
//       });
//   });
// });
