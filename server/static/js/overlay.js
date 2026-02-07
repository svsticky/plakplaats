function overlayState() {
  return {
    open: false,
    isMobile: window.innerWidth < 768,
    dragStartY: 0,
    overlayHeight: 0,
    error: null,

    init() {
      window.addEventListener("resize", () => {
        this.isMobile = window.innerWidth < 768;
        if (!this.isMobile) this.resetMobileStyles();
      });
    },

    toggleDesktop() {
      this.open = !this.open;

      if (this.open) {
        this.$nextTick(() => {
          htmx.trigger("#stickerList", "overlay-open");
        });
      }

      document.getElementById("nearYouDesktopToggleButton").innerText = this
        .open
        ? "Hide Stickers"
        : "Show Stickers";
    },

    resetMobileStyles() {
      document.getElementById("nearYouOverlay").style.bottom = "";
    },

    onTouchStart(e) {
      this.dragStartY = e.touches[0].clientY;
      this.overlayHeight = this.$el.clientHeight;
    },

    onTouchMove(e) {
      const deltaY = e.touches[0].clientY - this.dragStartY;
      const limit = -this.overlayHeight * 0.8;
      const newBottom = Math.max(limit, -deltaY);
      this.$el.style.bottom = `${newBottom}px`;
      e.preventDefault();
    },

    onTouchEnd() {
      const threshold = -this.overlayHeight * 0.3;
      if (parseInt(this.$el.style.bottom) < threshold) {
        this.open = false;
      } else {
        this.open = true;
        this.$el.style.bottom = "0";

        this.$nextTick(() => {
          htmx.trigger("#stickerList", "overlay-open");
        });
      }
    },
  };
}

function toggleOverlay() {
  const overlay = document.getElementById("nearYouOverlay");
  overlay.classList.toggle("open");

  // Load stickers when opening
  if (overlay.classList.contains("open")) {
    htmx.trigger("#stickerList", "overlay-open");
  }
}

document.body.addEventListener("htmx:afterSwap", (e) => {
  if (e.target.id !== "stickerList") return;

  convertPostTimes();
  convertDistances();

  const cards = document.querySelectorAll(".overlay-sticker-card");
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add("revealed"), i * 400);
  });
});

function convertPostTimes() {
  document.querySelectorAll(".posttime").forEach((el) => {
    const iso = el.dataset.posttime;
    if (!iso) return;
    el.innerText = "Posted " + dayjs(iso).fromNow();
  });
}

function convertDistances() {
  document.querySelectorAll(".distance").forEach((el) => {
    const d = parseFloat(el.dataset.distance);
    if (isNaN(d)) return;

    if (d < 1000) {
      el.innerText = `${Math.round(d)} m away`;
    } else {
      el.innerText = `${(d / 1000).toFixed(2)} km away`;
    }
  });
}
