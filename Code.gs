/**
 * Nhận dữ liệu từ form "Contact us / Book a demo" trên website:
 *  1) Ghi 1 dòng mới vào Google Sheets
 *  2) Gửi email thông báo cho admin (bấm Reply sẽ trả lời thẳng cho người gửi)
 *  3) Trả JSON {ok:true} để website hiện alert "Successful"
 *
 * Website gửi lên các trường: name, organisation, email, phone, role, message
 * Sau khi sửa file này: Triển khai > Quản lý bản triển khai > Chỉnh sửa > Phiên bản mới > Triển khai
 */

var ADMIN_EMAIL = 'hi@psymetric.app';   // <-- đổi thành email nhận thông báo (nhiều email: phân cách bằng dấu phẩy)
var SHEET_NAME  = 'Requests';            // tên tab trong Google Sheet (tự tạo nếu chưa có)

// Cột mới (Email, Phone) được thêm ở CUỐI để không làm lệch dữ liệu cũ
var HEADERS = ['Submitted at', 'Name', 'Organisation', 'I am a', 'How can we help?', 'Email', 'Phone'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var data  = JSON.parse(e.postData.contents);
    var name  = trim_(data.name);
    var org   = trim_(data.organisation);
    var email = trim_(data.email);
    var phone = trim_(data.phone);
    var role  = trim_(data.role);
    var msg   = trim_(data.message);

    // Email là trường bắt buộc
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: 'Invalid email' });
    }

    // 1) Ghi vào Google Sheets
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    if (headerRange.getValues()[0].join('|') !== HEADERS.join('|')) {
      headerRange.setValues([HEADERS]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), safe_(name), safe_(org), safe_(role), safe_(msg), safe_(email), safe_(phone)]);

    // 2) Gửi email cho admin
    var body =
      'Có một yêu cầu mới từ form trên website:\n\n' +
      'Name: ' + name + '\n' +
      'Organisation: ' + org + '\n' +
      'Email: ' + email + '\n' +
      'Phone: ' + (phone || '(không điền)') + '\n' +
      'I am a: ' + role + '\n\n' +
      'How can we help?\n' + msg + '\n\n' +
      'Xem tất cả: ' + ss.getUrl();
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: 'New request: ' + (name || email) + (org ? ' (' + org + ')' : ''),
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

function trim_(v) {
  return (v == null ? '' : String(v)).trim().slice(0, 2000);
}

// Chặn Google Sheets hiểu nhầm là công thức (=, +, -, @ ở đầu ô). Chỉ dùng khi ghi vào Sheet.
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
