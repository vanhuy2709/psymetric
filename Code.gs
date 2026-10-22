/**
 * Nhận dữ liệu từ form "Book a demo" trên website:
 *  1) Ghi 1 dòng mới vào Google Sheets
 *  2) Gửi email thông báo cho admin
 *  3) Trả JSON {ok:true} để website hiện alert "Successful"
 *
 * Cách dùng: gắn script này vào Google Sheet (Tiện ích mở rộng > Apps Script),
 * sửa ADMIN_EMAIL bên dưới, rồi Triển khai > Ứng dụng web.
 */

var ADMIN_EMAIL = 'admin@example.com';   // <-- đổi thành email nhận thông báo (nhiều email: phân cách bằng dấu phẩy)
var SHEET_NAME  = 'Requests';            // tên tab trong Google Sheet (tự tạo nếu chưa có)

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var data = JSON.parse(e.postData.contents);
    var name  = clean_(data.name);
    var org   = clean_(data.organisation);
    var role  = clean_(data.role);
    var msg   = clean_(data.message);

    if (!name) return json_({ ok: false, error: 'Missing name' });

    // 1) Ghi vào Google Sheets
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Submitted at', 'Name', 'Organisation', 'I am a', 'How can we help?']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), name, org, role, msg]);

    // 2) Gửi email cho admin
    var body =
      'Có một yêu cầu mới từ form Book a demo:\n\n' +
      'Name: ' + name + '\n' +
      'Organisation: ' + org + '\n' +
      'I am a: ' + role + '\n\n' +
      'How can we help?\n' + msg + '\n\n' +
      'Xem tất cả: ' + ss.getUrl();
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: 'New demo request: ' + name + (org ? ' (' + org + ')' : ''),
      body: body
    });

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Mở link /exec trực tiếp trên trình duyệt sẽ hiện dòng này -> dùng để kiểm tra đã deploy được chưa
function doGet() {
  return ContentService.createTextOutput('Form endpoint is running.');
}

function clean_(v) {
  v = (v == null ? '' : String(v)).trim().slice(0, 2000);
  // chặn Google Sheets hiểu nhầm là công thức (=, +, -, @ ở đầu ô)
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
