from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from datetime import datetime
from config import Config
from models import db, User, Assignment, NotificationHistory
from scheduler import init_scheduler
import requests

app = Flask(__name__)
app.config.from_object(Config)

# Initialize Database
db.init_app(app)

# Create Database tables if they do not exist
with app.app_context():
    db.create_all()

# Start background APScheduler task worker
scheduler = init_scheduler(app)

# Helper function to get current logged in user
def get_current_user():
    if 'user_id' not in session:
        return None
    return User.query.get(session['user_id'])

# =========================================================================
# PAGE VIEW ROUTES
# =========================================================================

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash("請輸入帳號與密碼！", "danger")
            return render_template('login.html')
            
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            flash(f"歡迎回來，{username}！", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("帳號或密碼錯誤！", "danger")
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        email = request.form.get('email', '').strip() or None
        
        if not username or not password:
            flash("請輸入帳號與密碼！", "danger")
            return render_template('register.html')
            
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash("該帳號名稱已被註冊！", "danger")
            return render_template('register.html')
            
        if email:
            existing_email = User.query.filter_by(email=email).first()
            if existing_email:
                flash("該 Email 已被使用！", "danger")
                return render_template('register.html')
                
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash("註冊成功！請登入您的帳號。", "success")
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("您已安全登出系統。", "info")
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    user = get_current_user()
    if not user:
        flash("請先登入系統！", "warning")
        return redirect(url_for('login'))
        
    return render_template('dashboard.html', user=user)

# =========================================================================
# ASSIGNMENT CRUD API ROUTES
# =========================================================================

@app.route('/api/assignments', methods=['GET'])
def api_get_assignments():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    assignments = Assignment.query.filter_by(user_id=user.id).order_by(Assignment.deadline.asc()).all()
    
    result = []
    for ass in assignments:
        result.append({
            "id": ass.id,
            "title": ass.title,
            "course_name": ass.course_name,
            "deadline": ass.deadline.strftime('%Y-%m-%dT%H:%M'),
            "status": ass.status,
            "description": ass.description or "",
            "remind_before_hours": ass.remind_before_hours
        })
    return jsonify(result)

@app.route('/api/assignments', methods=['POST'])
def api_create_assignment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    
    # Form submission fallback
    title = data.get('title') or request.form.get('title')
    course_name = data.get('course_name') or request.form.get('course_name')
    deadline_str = data.get('deadline') or request.form.get('deadline')
    remind_before_hours = data.get('remind_before_hours') or request.form.get('remind_before_hours') or 24
    description = data.get('description') or request.form.get('description') or ""
    
    if not title or not course_name or not deadline_str:
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        # Expected format from datetime-local input: 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD HH:MM'
        deadline_str = deadline_str.replace('T', ' ')
        if len(deadline_str) == 16:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M')
        else:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M:%S')
    except Exception as e:
        return jsonify({"error": f"Invalid date format: {str(e)}"}), 400
        
    ass = Assignment(
        user_id=user.id,
        title=title.strip(),
        course_name=course_name.strip(),
        deadline=deadline,
        remind_before_hours=int(remind_before_hours),
        description=description.strip(),
        status='pending'
    )
    db.session.add(ass)
    db.session.commit()
    
    return jsonify({"success": True, "message": "作業新增成功！", "assignment_id": ass.id})

@app.route('/api/assignments/<int:assignment_id>/edit', methods=['POST'])
def api_edit_assignment(assignment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    ass = Assignment.query.filter_by(id=assignment_id, user_id=user.id).first_or_404()
    data = request.get_json() or {}
    
    title = data.get('title')
    course_name = data.get('course_name')
    deadline_str = data.get('deadline')
    remind_before_hours = data.get('remind_before_hours')
    description = data.get('description')
    
    if title: ass.title = title.strip()
    if course_name: ass.course_name = course_name.strip()
    if description is not None: ass.description = description.strip()
    if remind_before_hours is not None: ass.remind_before_hours = int(remind_before_hours)
    
    if deadline_str:
        try:
            deadline_str = deadline_str.replace('T', ' ')
            if len(deadline_str) == 16:
                ass.deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M')
            else:
                ass.deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M:%S')
        except Exception as e:
            return jsonify({"error": f"Invalid date format: {str(e)}"}), 400
            
    db.session.commit()
    return jsonify({"success": True, "message": "作業修改成功！"})

@app.route('/api/assignments/<int:assignment_id>/toggle', methods=['POST'])
def api_toggle_assignment(assignment_id):
    """
    Toggles between 'pending' and 'completed'.
    F-02 requirement: stopping notifications immediately when completed.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    ass = Assignment.query.filter_by(id=assignment_id, user_id=user.id).first_or_404()
    
    # Toggle logic
    if ass.status == 'pending':
        ass.status = 'completed'
        message = "作業已標記為完成！系統將停止此作業的後續提醒通知。"
    else:
        ass.status = 'pending'
        # Clean successful notification history for this assignment so it can alert again if the time criteria is met
        NotificationHistory.query.filter_by(assignment_id=ass.id, status='success').delete()
        message = "作業已重設為未繳交，提醒系統重新啟動。"
        
    db.session.commit()
    return jsonify({"success": True, "status": ass.status, "message": message})

@app.route('/api/assignments/<int:assignment_id>/delete', methods=['POST'])
def api_delete_assignment(assignment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    ass = Assignment.query.filter_by(id=assignment_id, user_id=user.id).first_or_404()
    db.session.delete(ass)
    db.session.commit()
    
    return jsonify({"success": True, "message": "作業已刪除。"})

# =========================================================================
# PROFILE & BINDINGS API ROUTES
# =========================================================================

@app.route('/api/profile/update', methods=['POST'])
def api_update_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    
    if email:
        # Check if email taken by other user
        taken = User.query.filter(User.email == email, User.id != user.id).first()
        if taken:
            return jsonify({"error": "該 Email 已被其他帳號綁定"}), 400
        user.email = email
    else:
        user.email = None
        
    db.session.commit()
    return jsonify({"success": True, "message": "個人資訊更新成功！"})

@app.route('/api/profile/save-line-token', methods=['POST'])
def api_save_line_token():
    """
    Direct Personal Access Token saving.
    Super easy for localhost development and academic presentations.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    token = data.get('line_token', '').strip()
    
    if token:
        user.line_token = token
        message = "LINE Notify 個人 Token 已成功儲存！"
    else:
        user.line_token = None
        message = "LINE 綁定已解除。"
        
    db.session.commit()
    return jsonify({"success": True, "message": message})

# LINE Notify OAuth Flow
@app.route('/line/bind')
def line_bind():
    user = get_current_user()
    if not user:
        return redirect(url_for('login'))
        
    client_id = app.config.get('LINE_CLIENT_ID')
    redirect_uri = app.config.get('LINE_REDIRECT_URI')
    
    if client_id == 'mock_client_id':
        # Fallback Mock Flow for demonstration without OAuth Setup
        # Direct generation of a dummy token
        user.line_token = "mock_line_token_12345"
        db.session.commit()
        flash("【模擬綁定】已成功啟用 LINE 模擬推送服務！", "success")
        return redirect(url_for('dashboard'))
        
    # Standard OAuth Redirect
    state = f"user_{user.id}"
    line_url = f"https://notify-bot.line.me/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=notify&state={state}"
    return redirect(line_url)

@app.route('/auth/line/callback')
def line_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code:
        flash("LINE 授權失敗：未取得驗證碼", "danger")
        return redirect(url_for('dashboard'))
        
    # Exchange code for token
    url = "https://notify-bot.line.me/oauth/token"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": app.config.get('LINE_REDIRECT_URI'),
        "client_id": app.config.get('LINE_CLIENT_ID'),
        "client_secret": app.config.get('LINE_CLIENT_SECRET')
    }
    
    try:
        response = requests.post(url, data=payload, timeout=10)
        data = response.json()
        token = data.get('access_token')
        
        if token:
            user_id = int(state.split('_')[1])
            user = User.query.get(user_id)
            if user:
                user.line_token = token
                db.session.commit()
                flash("LINE Notify 帳號綁定成功！", "success")
            else:
                flash("LINE 綁定失敗：找不到使用者", "danger")
        else:
            flash(f"LINE 綁定失敗：{data.get('error_description', '未知錯誤')}", "danger")
    except Exception as e:
        flash(f"LINE 綁定異常：{str(e)}", "danger")
        
    return redirect(url_for('dashboard'))

@app.route('/line/unbind', methods=['POST'])
def line_unbind():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    user.line_token = None
    db.session.commit()
    return jsonify({"success": True, "message": "LINE Notify 帳號解綁成功。"})

# =========================================================================
# NOTIFICATION LOGS CENTER ROUTES
# =========================================================================

@app.route('/api/notifications', methods=['GET'])
def api_get_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    # Query notification histories linked to this user's assignments
    logs = db.session.query(NotificationHistory)\
        .join(Assignment, NotificationHistory.assignment_id == Assignment.id)\
        .filter(Assignment.user_id == user.id)\
        .order_by(NotificationHistory.triggered_at.desc())\
        .all()
        
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "assignment_title": log.assignment.title,
            "course_name": log.assignment.course_name,
            "triggered_at": log.triggered_at.strftime('%Y-%m-%d %H:%M:%S'),
            "status": log.status,
            "message": log.message
        })
    return jsonify(result)

@app.route('/api/notifications/clear', methods=['POST'])
def api_clear_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    # Delete logs for this user's assignments
    user_assignments = Assignment.query.filter_by(user_id=user.id).all()
    assignment_ids = [ass.id for ass in user_assignments]
    
    if assignment_ids:
        NotificationHistory.query.filter(NotificationHistory.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
        db.session.commit()
        
    return jsonify({"success": True, "message": "通知記錄已全數清除。"})

# Run Flask
if __name__ == '__main__':
    # Threaded parameter allows simultaneous handling of scheduler triggers and user HTTP actions
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
