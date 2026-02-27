self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Emergency", body: "Please clear the road." };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: "explore", title: "View Map" }
      ]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/driver")
  );
});
