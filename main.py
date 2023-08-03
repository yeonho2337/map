from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)



# SQLite 데이터베이스 연결 함수
def connect_db():
    conn = sqlite3.connect('places.db')
    return conn

# 장소 정보 테이블 생성 함수
def create_table():
    conn = connect_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mipmap_level INTEGER,
                mipmap_index INTEGER,
                x INTEGER,
                y INTEGER,
                place_number INTEGER UNIQUE,
                place_name TEXT,
                place_description TEXT
            )''')

    conn.commit()
    conn.close()
def save_place(mipmap_level, mipmap_index, x, y, place_name, place_description, place_number):
    conn = connect_db()
    c = conn.cursor()

 

    # 이미 존재하는 place_number를 가진 레코드가 있는지 확인
    c.execute('''SELECT id FROM places WHERE place_number = ?''', (place_number,))
    existing_place = c.fetchone()

    if existing_place:
        conn.close()
        return 'Place number already exists.'
    else:
        try:
            # 중복되지 않으면 새로운 장소 정보 추가
            c.execute('''INSERT INTO places (mipmap_level, mipmap_index, x, y, place_name, place_description, place_number)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''', (mipmap_level, mipmap_index, x, y, place_name, place_description, place_number))
            conn.commit()
            conn.close()
            return 'Place information saved successfully.'
        except sqlite3.IntegrityError as e:
            conn.close()
            return 'Error saving place information: ' + str(e)



    
# 위치 정보 가져오기 함수
def get_place_info(mipmap_level, mipmap_index):
    conn = connect_db()
    c = conn.cursor()
    c.execute('''SELECT mipmap_index, x, y, place_name, place_description, place_number
                 FROM places WHERE mipmap_level = ? AND mipmap_index = ?''', (mipmap_level, mipmap_index))
    print(c)
    place_info = c.fetchall()
    conn.close()
    return place_info


@app.route('/get_place_info')
def get_place_info_api():
    mipmap_level = request.args.get('mipmap_level')
    mipmap_index = request.args.get('mipmap_index')
    
    place_info = get_place_info(mipmap_level, mipmap_index)
    print(place_info)
    if place_info:
        return jsonify(place_info)  # 리스트 형태로 모든 장소 정보를 반환
    else:
        return jsonify([])  # 장소 정보가 없으면 빈 리스트를 반환



# 뷰 함수 정의
@app.route('/')
def index():
    return render_template('map.html')

# 관리자 페이지 라우트
@app.route('/admin')
def admin():
    return render_template('admin.html')

# 장소 정보 저장 API
@app.route('/save_place', methods=['POST'])
def save_place_api():
    if request.method == 'POST':
        mipmap_level = request.form.get('mipmap_level')
        mipmap_index = request.form.get('mipmap_index')
        x = request.form.get('x')
        y = request.form.get('y')
        place_name = request.form.get('place_name')
        place_description = request.form.get('place_description')
        place_number = request.form.get('place_number')  # 장소 번호 추가
        
        save_place(mipmap_level, mipmap_index, x, y, place_name, place_description, place_number)  # 장소 번호 추가
        return jsonify({'message': 'Place information saved successfully.'})

# 장소 정보 수정 함수
def edit_place(original_number, new_number, place_name, place_description):
    conn = connect_db()
    c = conn.cursor()
    c.execute('''UPDATE places 
                 SET place_number = ?, place_name = ?, place_description = ?
                 WHERE place_number = ?''', (new_number, place_name, place_description, original_number))
    conn.commit()
    conn.close()


# 장소 정보 삭제 함수
def delete_place(id):
    conn = connect_db()
    c = conn.cursor()
    c.execute('''DELETE FROM places WHERE place_number = ?''', (id,))
    conn.commit()
    conn.close()
# 장소 정보 수정 API
@app.route('/edit_place', methods=['POST'])
def edit_place_api():
    if request.method == 'POST':
        original_number = request.form.get('original_number')  # 원래 번호
        new_number = request.form.get('new_number')  # 바뀔 번호
        place_name = request.form.get('place_name')
        place_description = request.form.get('place_description')
        edit_place(original_number, new_number, place_name, place_description)
        return jsonify({'message': 'Place information edited successfully.'})



# 장소 정보 삭제 API
@app.route('/delete_place', methods=['POST'])
def delete_place_api():
    if request.method == 'POST':
        id = request.form.get('id')
        delete_place(id)
        return jsonify({'message': 'Place information deleted successfully.'})


if __name__ == '__main__':
    create_table()  # 테이블 생성
    app.run(debug=True)
