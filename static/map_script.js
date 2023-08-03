var maxZoomLevel = 2; // 최대 확대 레벨 (밉맵의 최대 단계)
var minZoomLevel = 0; // 최소 확대 레벨 (원본 지도의 초기 레벨)
var currentMipmapLevel = 1; // 초기 밉맵 단계 설정
var currentMipmapIndex = 0; // 초기 밉맵 인덱스 설정
var currentMipmapLayer = null; // 현재 밉맵 이미지 레이어

var adminInput = '';


// 키 입력 이벤트 리스너 등록
document.addEventListener('keyup', function(event) {
  // Enter 키 입력 시 관리자 페이지로 이동을 확인하는 로직
  if (event.key === 'Enter') {
    if (adminInput === 'admin') {
      // "admin"을 입력한 경우, 관리자 페이지로 이동
      window.location.href = 'admin';
    } else {
      // 입력 내용 초기화
      adminInput = '';
    }
  } else {
    // 입력 내용에 문자 추가
    adminInput += event.key;
  }
});

// 지도 초기화
var map = L.map('map-container', {
  zoomControl: false, // + / - 버튼 숨기기
  scrollWheelZoom: false // 마우스 휠로 확대/축소 비활성화
}).setView([37.5, 127], 5);


// 모든 팝업과 마커를 숨기는 함수
function hideAllPopups() {
  // 맵 내의 모든 팝업 숨기기
  map.closePopup();

  // 맵 내의 모든 마커 삭제
  map.eachLayer(function (layer) {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
}



// 밉맵 이미지 레이어 추가 함수
function addMipmapLayer(mipmapLevel, mipmapIndex) {
  var mipmapUrl = `static/mipmaps/${mipmapLevel}/${mipmapIndex}.png`;
  var bounds = map.getBounds();

  // 모든 말풍선 숨기기
  hideAllPopups();

  fetch(mipmapUrl)
    .then(response => response.blob())
    .then(blob => {
      var mipmapLayer = L.imageOverlay(URL.createObjectURL(blob), bounds);
      mipmapLayer.addTo(map);
     

      // 기존 레이어 삭제
      if (currentMipmapLayer) {
        map.removeLayer(currentMipmapLayer);
        
      }

      currentMipmapLayer = mipmapLayer;
      currentMipmapLevel = mipmapLevel;
      currentMipmapIndex = mipmapIndex;
      

      // 말풍선(팝업) 표시를 위해 showPopupOnImage 함수 호출
      if (mipmapLevel === 2) {
        
        fetch(`/get_place_info?mipmap_level=${mipmapLevel}&mipmap_index=${mipmapIndex}`)
          .then(response => response.json())
          .then(placeInfoArray => {
            if (Array.isArray(placeInfoArray)) {
              placeInfoArray.forEach(placeInfo => {
                var x = parseInt(placeInfo[1]);
                var y = parseInt(placeInfo[2]);

                if (!isNaN(x) && !isNaN(y)) {
                  // x, y, name, description 정보를 showPopupOnImage 함수로 전달하여 팝업을 표시합니다.
                  showPopupOnImage(x, y, placeInfo[3], placeInfo[4], placeInfo[5]);
                  
                }
              });
            }
          })
          .catch(error => {
            console.error('Error fetching place information:', error);
          });
      }
    });
}

// 말풍선(팝업)을 표시하는 함수
function showPopupOnImage(x, y, name, description, number) {
  // x와 y 좌표를 기반으로 해당 위치에 커스텀 마커를 생성합니다.
  
  var marker = L.marker(map.containerPointToLatLng([x, y]), {
      icon: L.divIcon({
          className: 'custom-marker',
          iconSize: [32, 32],
      }),
      riseOnHover: true,
  }).addTo(map);


        // 마커 클릭 이벤트 리스너 등록
marker.on('click', function () {
  // 클릭 시 팝업(말풍선)을 열어서 name과 description을 보여줍니다.
  var popupContent = `
  <p>번호: ${number}</p>
    <p>이름: ${name}</p>
    <p>설명: ${description}</p>

  `;
  var popup = L.popup()
    .setLatLng(marker.getLatLng())
    .setContent(popupContent)
    .openOn(map);
});
}









// 구역 클릭 이벤트 리스너 등록
map.on('click', function(e) {
  // 클릭한 위치 좌표 (픽셀 좌표)
  var mapContainer = document.getElementById('map-container');
  var mapRect = mapContainer.getBoundingClientRect();
  var x = e.originalEvent.clientX - mapRect.left;
  var y = e.originalEvent.clientY - mapRect.top;

  // 4구역으로 나누는 기준 경도와 위도 (픽셀 좌표)
  var divideX = (mapContainer.offsetWidth / 2);
  var divideY = (mapContainer.offsetHeight / 2);

  // 구역 판별
  var mipmapIndex = 0; // 밉맵 인덱스 초기값 설정
  if (y <= divideY) {
    // 북쪽 구역
    if (x >= divideX) {
      // 동쪽 구역
      mipmapIndex = 1;
    } else {
      // 서쪽 구역
      mipmapIndex = 0;
    }
  } else {
    // 남쪽 구역
    if (x >= divideX) {
      // 동쪽 구역
      mipmapIndex = 3;
    } else {
      // 서쪽 구역
      mipmapIndex = 2;
    }
  }

  // 밉맵 레벨 계산
  var newMipmapLevel = currentMipmapLevel === 0 ? 1 : currentMipmapLevel + 1;

  // 레벨 2를 초과하는 경우 더 이상 밉맵 레벨을 올리지 않음
  if (newMipmapLevel > 2) {
    return;
  }

  // 밉맵 이미지 변경
  addMipmapLayer(newMipmapLevel, mipmapIndex);

  // 2단계의 경우 하위 구역 이미지들도 추가
  if (newMipmapLevel === 2) {
    var subMipmapIndex = 4 * currentMipmapIndex + mipmapIndex; // 하위 구역 이미지 인덱스 계산
    addMipmapLayer(newMipmapLevel, subMipmapIndex);
  }
});

// 마우스 우클릭 이벤트 리스너 등록
map.on('contextmenu', function(e) {
  // 레벨 0일 때는 더 이상 밉맵 레벨을 감소시키지 않음
  if (currentMipmapLevel === 0) {
    return;
  }

  // 밉맵 레벨 감소
  var newMipmapLevel = currentMipmapLevel - 1;

  // 하위 구역 이미지 인덱스 계산
  var subMipmapIndex = Math.floor(currentMipmapIndex / 4);

  // 밉맵 이미지 변경
  addMipmapLayer(newMipmapLevel, subMipmapIndex);
});


// 확대 버튼 클릭 이벤트 리스너 등록
document.getElementById('zoom-in').addEventListener('click', function(event) {
  event.stopPropagation(); // 이벤트 전파 막음
  var newMipmapLevel = currentMipmapLevel === 0 ? 1 : currentMipmapLevel + 1;
  if (newMipmapLevel <= maxZoomLevel) {
    var subMipmapIndex = 4 * currentMipmapIndex; // 하위 구역 이미지 인덱스 계산
    addMipmapLayer(newMipmapLevel, subMipmapIndex);
  }
});

// 축소 버튼 클릭 이벤트 리스너 등록
document.getElementById('zoom-out').addEventListener('click', function(event) {
  event.stopPropagation(); // 이벤트 전파 막음
  // 레벨 0일 때는 더 이상 밉맵 레벨을 감소시키지 않음
  if (currentMipmapLevel === 0) {
    return;
  }

  // 밉맵 레벨 감소
  var newMipmapLevel = currentMipmapLevel - 1;

  // 하위 구역 이미지 인덱스 계산
  var subMipmapIndex = Math.floor(currentMipmapIndex / 4);

  // 밉맵 이미지 변경
  addMipmapLayer(newMipmapLevel, subMipmapIndex);
});

// 초기 밉맵 이미지 레이어 추가 (1단계의 0번 인덱스로 설정)
addMipmapLayer(currentMipmapLevel, 0);
