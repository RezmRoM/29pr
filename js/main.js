let currentUser = null;
let selectedFlights = {
  outbound: null,
  return: null,
};
let selectedSeats = {};

$(document).ready(function () {
  // Проверяем сохраненного пользователя при загрузке
  checkAuth();

  loadPage("main");

  $(document).on("click", "[data-page]", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    loadPage(page);
  });

  // Обновляем UI в зависимости от состояния авторизации
  updateAuthUI();
});

function updateAuthUI() {
  const isAuthenticated = currentUser !== null;
  if (isAuthenticated) {
    $(".auth-required").show();
    $(".no-auth").hide();
  } else {
    $(".auth-required").hide();
    $(".no-auth").show();
  }
}

function loadPage(page) {
  // Проверяем авторизацию для защищенных страниц
  const protectedPages = [
    "booking",
    "seat-selection",
    "manage-booking",
    "profile",
  ];
  if (protectedPages.includes(page) && !checkAuth()) {
    showAlert("Пожалуйста, войдите в систему", "warning");
    page = "login";
  }

  $("#app").load(`pages/${page}.html`, function (response, status, xhr) {
    if (status === "error") {
      $("#app").html("<h2>Ошибка загрузки страницы</h2>");
      return;
    }
    initPageHandlers(page);
    updateAuthUI();
  });
}

function checkAuth() {
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    return true;
  }
  currentUser = null;
  return false;
}

function logout() {
  localStorage.removeItem("currentUser");
  currentUser = null;
  showAlert("Вы успешно вышли из системы", "info");
  updateAuthUI();
  loadPage("main");
}

function initPageHandlers(page) {
  switch (page) {
    case "main":
      initMainPage();
      break;
    case "login":
      initLoginPage();
      break;
    case "search-results":
      initSearchResults();
      break;
    case "booking":
      initBookingPage();
      break;
    case "seat-selection":
      initSeatSelection();
      break;
    case "manage-booking":
      initManageBooking();
      break;
    case "profile":
      initProfilePage();
      break;
    case "register":
      initRegisterPage();
      break;
  }
}

function initMainPage() {
  // Устанавливаем минимальную дату - сегодня
  const today = new Date().toISOString().split("T")[0];
  $('input[name="departure"]').attr("min", today);
  $('input[name="return"]').attr("min", today);

  // Добавляем список городов
  const cities = ["Москва", "Санкт-Петербург"];
  const datalist = `
      <datalist id="cities">
          ${cities.map((city) => `<option value="${city}">`).join("")}
      </datalist>
  `;
  $("#search-form").append(datalist);

  // Привязываем datalist к полям ввода
  $('input[name="from"]').attr("list", "cities");
  $('input[name="to"]').attr("list", "cities");

  $("#search-form").on("submit", function (e) {
    e.preventDefault();
    const formData = {
      from: $('input[name="from"]').val(),
      to: $('input[name="to"]').val(),
      departure: $('input[name="departure"]').val(),
      return: $('input[name="return"]').val(),
      passengers: $('select[name="passengers"]').val(),
    };

    // Проверяем, что города отправления и прибытия разные
    if (formData.from === formData.to) {
      alert("Города отправления и прибытия должны быть разными");
      return;
    }

    // Проверяем, что дата возврата позже даты вылета
    if (formData.return && formData.return < formData.departure) {
      alert("Дата возврата должна быть позже даты вылета");
      return;
    }

    localStorage.setItem("searchData", JSON.stringify(formData));
    loadPage("search-results");
  });
}

function initSearchResults() {
  const searchData = JSON.parse(localStorage.getItem("searchData"));
  if (!searchData) {
    loadPage("main");
    return;
  }

  // Отображаем рейсы из flightData
  displayFlights(flightData.flights);

  $("#flights-form").on("submit", function (e) {
    e.preventDefault();
    const selectedOutbound = $('input[name="outbound"]:checked').val();
    if (!selectedOutbound) {
      alert("Пожалуйста, выберите рейс");
      return;
    }
    selectedFlights.outbound = selectedOutbound;
    loadPage("booking");
  });
}

function initLoginPage() {
  $("#login-form").on("submit", function (e) {
    e.preventDefault();

    const email = $('input[name="email"]').val();
    const password = $('input[name="password"]').val();

    // Проверка данных
    const user = userData.users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      currentUser = user;
      localStorage.setItem("currentUser", JSON.stringify(user));
      // Показываем сообщение об успешном входе
      showAlert("Вход выполнен успешно!", "success");
      updateAuthUI();
      setTimeout(() => loadPage("profile"), 1000);
    } else {
      // Показываем сообщение об ошибке
      showAlert("Неверный email или пароль", "error");
    }
  });
}

function initRegisterPage() {
  const form = $("#register-form");

  // Проверка совпадения паролей
  $("#confirmPassword").on("input", function () {
    const password = $("#password").val();
    const confirmPassword = $(this).val();

    if (password !== confirmPassword) {
      this.setCustomValidity("Пароли не совпадают");
    } else {
      this.setCustomValidity("");
    }
  });

  form.on("submit", function (e) {
    e.preventDefault();

    const formData = {
      id: userData.users.length + 1,
      email: $('input[name="email"]').val(),
      firstName: $('input[name="firstName"]').val(),
      lastName: $('input[name="lastName"]').val(),
      phone: $('input[name="phone"]').val(),
      password: $('input[name="password"]').val(),
      flightsCount: 0,
    };

    // Проверяем, не существует ли уже пользователь с таким email
    if (userData.users.some((user) => user.email === formData.email)) {
      $(".alert").remove();
      form.before(
        '<div class="alert">Пользователь с таким email уже существует</div>'
      );
      return;
    }

    // Добавляем пользователя
    userData.users.push(formData);

    // Показываем сообщение об успешной регистрации
    $(".alert").remove();
    form.before(
      '<div class="alert alert-success">Регистрация успешна! Сейчас вы будете перенаправлены на страницу входа.</div>'
    );

    setTimeout(() => loadPage("login"), 2000);
  });
}

function initBookingPage() {
  const searchData = JSON.parse(localStorage.getItem("searchData"));
  const selectedFlight = flightData.flights.find(
    (f) => f.id === parseInt(selectedFlights.outbound)
  );

  // Отображаем информацию о выбранном рейсе
  $("#selected-flights").html(`
        <div class="selected-flight">
            <p>Рейс: ${selectedFlight.flightNumber}</p>
            <p>Откуда: ${selectedFlight.from}</p>
            <p>Куда: ${selectedFlight.to}</p>
            <p>Вылет: ${selectedFlight.departureTime}</p>
            <p>Прилет: ${selectedFlight.arrivalTime}</p>
        </div>
    `);

  // Создаем формы для каждого пассажира
  const passengersCount = parseInt(searchData.passengers);
  let passengersHtml = "";

  for (let i = 0; i < passengersCount; i++) {
    passengersHtml += `
            <div class="passenger-form">
                <h3>Пассажир ${i + 1}</h3>
                <div class="form-group">
                    <label>Фамилия</label>
                    <input type="text" name="surname_${i}" required 
                           pattern="[а-яА-ЯёЁ\\s\\-]{3,15}"
                           title="От 3 до 15 символов: русские буквы, пробел или дефис">
                </div>
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" name="name_${i}" required 
                           pattern="[а-яА-ЯёЁ\\s]{3,10}"
                           title="От 3 до 10 символов: русские буквы или пробел">
                </div>
                <div class="form-group">
                    <label>Дата рождения</label>
                    <input type="date" name="birthdate_${i}" required>
                </div>
                <div class="form-group">
                    <label>Номер документа</label>
                    <input type="text" name="document_${i}" required 
                           pattern="\\d{10}"
                           title="10 цифр">
                </div>
            </div>
        `;
  }

  $("#passengers-container").html(passengersHtml);

  // Обработка отправки формы
  $("#booking-form").on("submit", function (e) {
    e.preventDefault();
    // Сохраняем данные о бронировании
    const bookingData = {
      flight: selectedFlight,
      passengers: [],
    };

    for (let i = 0; i < passengersCount; i++) {
      bookingData.passengers.push({
        surname: $(`input[name="surname_${i}"]`).val(),
        name: $(`input[name="name_${i}"]`).val(),
        birthdate: $(`input[name="birthdate_${i}"]`).val(),
        document: $(`input[name="document_${i}"]`).val(),
      });
    }

    localStorage.setItem("bookingData", JSON.stringify(bookingData));
    loadPage("seat-selection");
  });
}

function initSeatSelection() {
  const bookingData = JSON.parse(localStorage.getItem("bookingData"));
  if (!bookingData) {
    loadPage("main");
    return;
  }

  const flightInfo = bookingData.flight;
  const passengers = bookingData.passengers;

  // Отображаем информацию о рейсе
  const flightInfoHtml = `
        <div class="flight-details">
            <p><strong>Рейс:</strong> ${flightInfo.flightNumber}</p>
            <p><strong>Маршрут:</strong> ${flightInfo.from} - ${flightInfo.to}</p>
            <p><strong>Дата:</strong> ${flightInfo.date}</p>
        </div>
    `;
  $("#flight-info").html(flightInfoHtml);

  // Добавляем подсказку для выбора пассажира
  const hint = `
        <div class="passenger-selection-hint">
            <i class="fas fa-info-circle"></i> Выберите пассажира, затем нажмите на место в схеме салона
        </div>
    `;
  $("#passengers-list").before(hint);

  // Отображаем список пассажиров
  const passengersHtml = passengers
    .map(
      (passenger, index) => `
        <div class="passenger-card" data-passenger-index="${index}">
            <p><strong>${passenger.surname} ${passenger.name}</strong></p>
            <p>Документ: ${passenger.document}</p>
            <p>Выбранное место: <span class="selected-seat">Не выбрано</span></p>
            <p class="select-prompt">Нажмите для выбора места</p>
        </div>
    `
    )
    .join("");
  $("#passengers-list").html(passengersHtml);

  // Генерируем схему мест
  let seatGrid = '<div class="seat-grid">';
  for (let row = 1; row <= 10; row++) {
    for (let seat = 1; seat <= 6; seat++) {
      const seatNumber = `${row}${String.fromCharCode(64 + seat)}`;
      const isOccupied = Math.random() < 0.3; // Имитация занятых мест
      const seatClass = isOccupied ? "occupied" : "available";
      seatGrid += `<div class="seat ${seatClass}" data-seat="${seatNumber}">${seatNumber}</div>`;
    }
  }
  seatGrid += "</div>";
  $("#seat-map").html(seatGrid);

  // Добавляем обработчик клика для карточек пассажиров
  $(document).on("click", ".passenger-card", function () {
    const $this = $(this);

    // Если карточка уже активна - деактивируем
    if ($this.hasClass("active")) {
      $this.removeClass("active");
      $(".seat").removeClass("highlighted");
      return;
    }

    // Деактивируем все карточки и активируем выбранную
    $(".passenger-card").removeClass("active");
    $this.addClass("active");

    // Подсвечиваем место этого пассажира, если оно выбрано
    const selectedSeat = $this.find(".selected-seat").text();
    $(".seat").removeClass("highlighted");
    if (selectedSeat !== "Не выбрано") {
      $(`.seat[data-seat="${selectedSeat}"]`).addClass("highlighted");
    }

    // Показываем подсказку
    showAlert("Теперь выберите место на схеме салона", "info", 2000);
  });

  // Добавляем обработчик клика для мест
  $(document).on("click", ".seat", function (event) {
    const $seat = $(this);
    const seatNumber = $seat.data("seat");

    if ($seat.hasClass("occupied")) {
      showAlert("Это место уже занято", "error");
      return;
    }

    const $activePassenger = $(".passenger-card.active");
    if (!$activePassenger.length) {
      showAlert("Пожалуйста, сначала выберите пассажира", "warning");
      return;
    }

    // Снимаем выделение с предыдущего места
    const previousSeat = $activePassenger.find(".selected-seat").text();
    if (previousSeat !== "Не выбрано") {
      $(`.seat[data-seat="${previousSeat}"]`).removeClass(
        "selected highlighted"
      );
    }

    // Выбираем новое место
    $(".seat").removeClass("selected highlighted");
    $seat.addClass("selected highlighted");
    $activePassenger.find(".selected-seat").text(seatNumber);

    // Сохраняем выбор места
    const passengerIndex = $activePassenger.data("passenger-index");
    const selectedSeats =
      JSON.parse(localStorage.getItem("selectedSeats")) || {};
    selectedSeats[passengerIndex] = seatNumber;
    localStorage.setItem("selectedSeats", JSON.stringify(selectedSeats));

    // Показываем подтверждение
    showAlert("Место успешно выбрано!", "success", 2000);

    // Деактивируем пассажира после выбора места
    setTimeout(() => {
      $activePassenger.removeClass("active");
    }, 1000);
  });

  // Обработчик для кнопки подтверждения
  $("#confirm-seats").on("click", function () {
    const bookingData = JSON.parse(localStorage.getItem("bookingData"));
    if (!bookingData || !bookingData.passengers) {
      showAlert("Ошибка: данные о бронировании не найдены", "error");
      return;
    }

    let allSeatsSelected = true;
    const selectedSeats =
      JSON.parse(localStorage.getItem("selectedSeats")) || {};

    $(".passenger-card").each((index, card) => {
      const selectedSeat = $(card).find(".selected-seat").text();
      if (selectedSeat === "Не выбрано") {
        allSeatsSelected = false;
        return false;
      }
    });

    if (!allSeatsSelected) {
      showAlert("Пожалуйста, выберите места для всех пассажиров", "warning");
      return;
    }

    // Сохраняем бронирование в профиле пользователя
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      showAlert("Ошибка: пользователь не найден", "error");
      return;
    }

    // Создаем объект бронирования
    const booking = {
      id: Date.now(),
      date: new Date().toISOString(),
      flight: {
        number: flightInfo.flightNumber,
        from: flightInfo.from,
        to: flightInfo.to,
        departureTime: flightInfo.departureTime,
        arrivalTime: flightInfo.arrivalTime,
        date: new Date().toISOString(),
        duration: 90,
      },
      passengers: passengers.map((passenger, index) => ({
        firstName: passenger.name,
        lastName: passenger.surname,
        document: passenger.document,
        birthdate: passenger.birthdate,
      })),
      seats: selectedSeats,
      status: "upcoming",
    };

    // Добавляем бронирование в список поездок пользователя
    const userBookings =
      JSON.parse(localStorage.getItem(`bookings_${currentUser.email}`)) || [];
    userBookings.push(booking);
    localStorage.setItem(
      `bookings_${currentUser.email}`,
      JSON.stringify(userBookings)
    );

    // Очищаем данные текущего бронирования
    localStorage.removeItem("bookingData");
    localStorage.removeItem("selectedSeats");

    showAlert("Бронирование успешно завершено!", "success");
    setTimeout(() => loadPage("profile"), 1500);
  });

  // Восстанавливаем выбранные места
  const selectedSeats = JSON.parse(localStorage.getItem("selectedSeats")) || {};
  Object.entries(selectedSeats).forEach(([passengerIndex, seatNumber]) => {
    const $passengerCard = $(
      `.passenger-card[data-passenger-index="${passengerIndex}"]`
    );
    const $seat = $(`.seat[data-seat="${seatNumber}"]`);

    if ($passengerCard.length && $seat.length) {
      $seat.addClass("selected");
      $passengerCard.find(".selected-seat").text(seatNumber);
    }
  });
}

function initManageBooking() {
  const bookingData = JSON.parse(localStorage.getItem("bookingData"));
  if (!bookingData) {
    loadPage("main");
    return;
  }

  // Отображаем информацию о рейсе
  $("#booking-flight-info").html(`
        <div class="flight-details">
            <p><strong>Рейс:</strong> ${bookingData.flight.flightNumber}</p>
            <p><strong>Откуда:</strong> ${bookingData.flight.from}</p>
            <p><strong>Куда:</strong> ${bookingData.flight.to}</p>
            <p><strong>Вылет:</strong> ${bookingData.flight.departureTime}</p>
            <p><strong>Прилет:</strong> ${bookingData.flight.arrivalTime}</p>
        </div>
    `);

  // Отображаем информацию о пассажирах
  let passengersHtml = "";
  bookingData.passengers.forEach((passenger) => {
    passengersHtml += `
            <tr>
                <td>${passenger.surname}</td>
                <td>${passenger.name}</td>
                <td>${passenger.birthdate}</td>
                <td>${passenger.document}</td>
                <td>${passenger.seat || "Не выбрано"}</td>
            </tr>
        `;
  });
  $("#passengers-info").html(passengersHtml);
}

function initProfilePage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    loadPage("login");
    return;
  }

  // Отображаем информацию о пользователе
  $("#user-details").html(`
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Имя:</strong> ${currentUser.firstName || "Не указано"}</p>
        <p><strong>Фамилия:</strong> ${currentUser.lastName || "Не указано"}</p>
    `);

  // Загружаем и отображаем бронирования пользователя
  const userBookings =
    JSON.parse(localStorage.getItem(`bookings_${currentUser.email}`)) || [];

  // Разделяем бронирования на предстоящие и прошедшие
  const upcomingBookings = userBookings.filter(
    (booking) => booking.status === "upcoming"
  );
  const pastBookings = userBookings.filter(
    (booking) => booking.status === "completed"
  );

  // Отображаем предстоящие рейсы
  if (upcomingBookings.length > 0) {
    const upcomingHtml = upcomingBookings
      .map(
        (booking) => `
            <div class="booking-card">
                <div class="flight-header">
                    <h3>Рейс ${booking.flight.number}</h3>
                    <span class="flight-status">Запланирован</span>
                </div>
                <div class="flight-route">
                    <div class="route-point">
                        <span class="city">${booking.flight.from}</span>
                        <span class="time">${
                          booking.flight.departureTime
                        }</span>
                    </div>
                    <div class="route-line">
                        <span class="plane">✈</span>
                    </div>
                    <div class="route-point">
                        <span class="city">${booking.flight.to}</span>
                        <span class="time">${booking.flight.arrivalTime}</span>
                    </div>
                </div>
                <div class="flight-details">
                    <p><strong>Дата вылета:</strong> ${new Date(
                      booking.date
                    ).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</p>
                    <p><strong>Продолжительность:</strong> ${
                      booking.flight.duration
                    } мин</p>
                </div>
                <div class="passengers-details">
                    <h4>Информация о пассажирах:</h4>
                    ${booking.passengers
                      .map(
                        (passenger, index) => `
                        <div class="passenger-info">
                            <p><strong>Пассажир ${index + 1}:</strong> ${
                          passenger.lastName
                        } ${passenger.firstName}</p>
                            <p class="seat-number">Место: ${
                              booking.seats[index]
                            }</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
      )
      .join("");
    $("#upcoming-flights").html(upcomingHtml);
  } else {
    $("#upcoming-flights").html(
      '<p class="no-flights">У вас нет запланированных поездок</p>'
    );
  }

  // Отображаем историю поездок
  if (pastBookings.length > 0) {
    const pastHtml = pastBookings
      .map(
        (booking) => `
            <div class="booking-card">
                <div class="flight-header">
                    <h3>Рейс ${booking.flight.number}</h3>
                    <span class="flight-status completed">Выполнен</span>
                </div>
                <div class="flight-route">
                    <div class="route-point">
                        <span class="city">${booking.flight.from}</span>
                        <span class="time">${
                          booking.flight.departureTime
                        }</span>
                    </div>
                    <div class="route-line">
                        <span class="plane">✈</span>
                    </div>
                    <div class="route-point">
                        <span class="city">${booking.flight.to}</span>
                        <span class="time">${booking.flight.arrivalTime}</span>
                    </div>
                </div>
                <div class="flight-details">
                    <p><strong>Дата вылета:</strong> ${new Date(
                      booking.date
                    ).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</p>
                    <p><strong>Продолжительность:</strong> ${
                      booking.flight.duration
                    } мин</p>
                </div>
                <div class="passengers-details">
                    <h4>Информация о пассажирах:</h4>
                    ${booking.passengers
                      .map(
                        (passenger, index) => `
                        <div class="passenger-info">
                            <p><strong>Пассажир ${index + 1}:</strong> ${
                          passenger.lastName
                        } ${passenger.firstName}</p>
                            <p class="seat-number">Место: ${
                              booking.seats[index]
                            }</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
      )
      .join("");
    $("#past-flights").html(pastHtml);
  } else {
    $("#past-flights").html('<p class="no-flights">История поездок пуста</p>');
  }

  // Обработчик выхода
  $("#logout-btn").on("click", logout);
}

function displayFlights(flights) {
  let flightsHtml = "";
  flights.forEach((flight) => {
    flightsHtml += `
            <tr>
                <td><input type="radio" name="outbound" value="${flight.id}" required></td>
                <td>${flight.flightNumber}</td>
                <td>${flight.from}</td>
                <td>${flight.to}</td>
                <td>${flight.departureTime}</td>
                <td>${flight.arrivalTime}</td>
                <td>${flight.price} ₽</td>
            </tr>
        `;
  });

  $(".flights-table tbody").html(flightsHtml);
}

// Функция для отображения уведомлений
function showAlert(message, type = "info", duration = 3000) {
  // Удаляем предыдущие уведомления
  $(".alert").remove();

  // Создаем новое уведомление
  const alertDiv = $("<div>", {
    class: `alert alert-${type}`,
    text: message,
  });

  // Добавляем уведомление в начало контейнера
  $("#seat-selection-container").prepend(alertDiv);

  // Автоматически скрываем через указанное время
  if (duration > 0) {
    setTimeout(() => {
      alertDiv.fadeOut(300, function () {
        $(this).remove();
      });
    }, duration);
  }
}
