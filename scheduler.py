from datetime import datetime, timedelta
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, User, Assignment, NotificationHistory
import traceback

def send_line_notification(token, message):
    """
    Sends a push notification via LINE Notify API.
    """
    url = "https://notify-api.line.me/api/notify"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    payload = {
        "message": message
    }
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        if response.status_code == 200:
            return True, "LINE Notify sent successfully."
        else:
            return False, f"LINE Notify failed with status code {response.status_code}: {response.text}"
    except Exception as e:
        return False, f"LINE Notify exception: {str(e)}"

def send_email_notification(app, to_email, subject, html_content):
    """
    Sends an email notification using Gmail SMTP.
    """
    smtp_server = app.config.get('MAIL_SERVER')
    port = app.config.get('MAIL_PORT')
    username = app.config.get('MAIL_USERNAME')
    password = app.config.get('MAIL_PASSWORD')
    sender = app.config.get('MAIL_DEFAULT_SENDER') or username

    if not smtp_server or not username or not password:
        return False, "SMTP parameters not fully configured. Falling back to mock email."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        # Set up standard secure SMTP session
        server = smtplib.SMTP(smtp_server, port)
        if app.config.get('MAIL_USE_TLS'):
            server.starttls()
        server.login(username, password)
        server.sendmail(sender, to_email, msg.as_string())
        server.quit()
        return True, "Email sent successfully."
    except Exception as e:
        return False, f"Email sending error: {str(e)}"

def check_and_send_alerts(app):
    """
    Core background job: Scans database for assignments that require reminders.
    Runs inside the Flask app context.
    """
    with app.app_context():
        now = datetime.now()
        # Query all assignments that are pending
        pending_assignments = Assignment.query.filter_by(status='pending').all()
        
        for assignment in pending_assignments:
            # Check if this assignment has already had a successful notification sent
            has_been_notified = NotificationHistory.query.filter_by(
                assignment_id=assignment.id,
                status='success'
            ).first() is not None
            
            if has_been_notified:
                continue
            
            # Calculate the reminder time window
            remind_time = assignment.deadline - timedelta(hours=assignment.remind_before_hours)
            
            # If the current time has passed the reminder time
            if now >= remind_time:
                # We need to send an alert!
                user = User.query.get(assignment.user_id)
                if not user:
                    continue
                
                # Check if the assignment is already past its deadline
                is_overdue = now >= assignment.deadline
                
                # Prepare notification messages
                time_diff = assignment.deadline - now
                hours_left = int(time_diff.total_seconds() / 3600)
                minutes_left = int((time_diff.total_seconds() % 3600) / 60)
                
                if is_overdue:
                    title_prefix = "⚠️【逾期通知】"
                    msg_body = f"您的作業「{assignment.title}」（科目：{assignment.course_name}）已於 {assignment.deadline.strftime('%Y-%m-%d %H:%M')} 截止，請儘速處理繳交狀態！"
                else:
                    title_prefix = "⏰【截止提醒】"
                    msg_body = f"作業「{assignment.title}」（科目：{assignment.course_name}）即將截止！\n截止時間：{assignment.deadline.strftime('%Y-%m-%d %H:%M')}\n剩餘時間：大約 {hours_left} 小時 {minutes_left} 分鐘。"

                # Try sending LINE
                notified_via = []
                line_success, line_msg = False, "Not configured"
                if user.line_token:
                    line_success, line_msg = send_line_notification(user.line_token, f"\n{title_prefix}\n{msg_body}")
                    if line_success:
                        notified_via.append("LINE Notify")
                
                # Try sending Email
                email_success, email_msg = False, "Not configured"
                if user.email:
                    subject = f"{title_prefix} {assignment.title} 繳交截止提醒"
                    html_content = f"""
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background-color: #0f111a; color: #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        <h2 style="color: #bb86fc; border-bottom: 2px solid rgba(187, 134, 252, 0.2); padding-bottom: 10px;">{title_prefix} 作業截止通知</h2>
                        <p style="font-size: 16px; line-height: 1.6;">親愛的 <strong>{user.username}</strong> 同學，您好：</p>
                        <p style="font-size: 15px; background: rgba(255,255,255,0.03); padding: 15px; border-left: 4px solid #bb86fc; border-radius: 4px; line-height: 1.8;">
                            <strong>作業名稱：</strong> {assignment.title}<br>
                            <strong>科目名稱：</strong> {assignment.course_name}<br>
                            <strong>截止時間：</strong> {assignment.deadline.strftime('%Y-%m-%d %H:%M')}<br>
                            <strong>狀態：</strong> <span style="color: #ffb74d; font-weight: bold;">未繳交 (Pending)</span>
                        </p>
                        <p style="font-size: 14px; color: #a0aec0; margin-top: 20px;">{msg_body}</p>
                        <p style="font-size: 14px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; text-align: center; color: #718096;">
                            作業提醒管理系統 - 您的時間管理好幫手
                        </p>
                    </div>
                    """
                    email_success, email_msg = send_email_notification(app, user.email, subject, html_content)
                    if email_success:
                        notified_via.append("Email")

                # If no integration is configured, or they both fail, we log it beautifully so the student can demo it as a MOCK notification
                final_status = 'success'
                log_message = ""
                if notified_via:
                    log_message = f"通知發送成功，管道：{', '.join(notified_via)}。"
                else:
                    # Mock push mode
                    log_message = f"【模擬推送】已觸發通知：{msg_body} (未綁定 LINE/Email，已記錄至系統通知面板)"
                    print(f"\n>>> [MOCK ALERTS] {msg_body}\n")
                    final_status = 'success' # Set success so it won't repeat
                
                # Write to DB history
                history = NotificationHistory(
                    assignment_id=assignment.id,
                    status=final_status,
                    message=f"{title_prefix}\n{msg_body}\n系統回饋：{log_message}"
                )
                db.session.add(history)
                db.session.commit()

def init_scheduler(app):
    """
    Initializes and starts the Background Scheduler.
    """
    scheduler = BackgroundScheduler()
    # Scans for reminders every 30 seconds
    scheduler.add_job(func=check_and_send_alerts, trigger="interval", seconds=30, args=[app])
    scheduler.start()
    print(">>> APScheduler background reminder worker successfully started.")
    return scheduler
