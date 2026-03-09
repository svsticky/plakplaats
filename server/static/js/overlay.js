const SNAP_THRESHOLD = 0.3;
const OVERLAY_HIDE_LIMIT = 0.8;

function overlayState() {
  return {
    open: false,
    isMobile: window.innerWidth < 768,
    dragStartY: 0,
    overlayHeight: 0,
    error: null,
    dragStartTime: 0,
    dragVelocity: 0,
    stickersLoaded: false,

    init() {
      this.$watch("open", value => {
        if (value && !this.stickersLoaded) {
          this.$nextTick(() => {
            htmx.trigger("#stickerList", "overlay-open");
            this.stickersLoaded = true;
          });
        }
      });

      window.addEventListener("resize", () => {
        this.isMobile = window.innerWidth < 768;

        if (!this.isMobile) {
          this.$el.style.bottom = "";
        }
      });
    },

    toggleDesktop() {
      this.open = !this.open;

      document.getElementById("toggle-chevron-img").src = this.open
        ? "../static/img/chevron-right.svg"
        : "../static/img/chevron-left.svg";
    },

    resetMobileStyles() {
      document.getElementById("nearYouOverlay").style.bottom = "";
    },

    onTouchStart(e) {
      if (!this.isMobile) return;

      this.dragStartY = e.touches[0].clientY;
      this.overlayHeight = this.$el.clientHeight;

      this.dragStartTime = Date.now();
    },

    onTouchMove(e) {
      if (!this.isMobile) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - this.dragStartY;

      const newBottom = Math.max(
        -this.overlayHeight * OVERLAY_HIDE_LIMIT,
        -deltaY
      );

      this.$el.style.bottom = `${newBottom}px`;

      const elapsed = Date.now() - this.dragStartTime;
      this.dragVelocity = deltaY / elapsed;

      if (
        this.$el.scrollHeight - this.$el.scrollTop ===
        this.$el.clientHeight
      ) {
        e.preventDefault();
      }
    },

    onTouchEnd() {
      if (!this.isMobile) return;

      const snapThreshold = -this.overlayHeight * SNAP_THRESHOLD;

      const isFastSwipeDown = this.dragVelocity > 0.5;
      const isFastSwipeUp = this.dragVelocity < -0.5;

      const currentBottom = parseInt(this.$el.style.bottom || 0);

      if (currentBottom < snapThreshold || isFastSwipeDown) {
        this.open = false;
        this.$el.style.bottom = "-75vh";
      }
      else if (isFastSwipeUp) {
        this.open = true;
        this.$el.style.bottom = "0";
      }
      else {
        this.open = true;
        this.$el.style.bottom = "0";
      }
    },
  };
}

function toggleOverlay() {
  const overlay = document.getElementById("nearYouOverlay");
  overlay.classList.toggle("open");
}

function closeOverlay() {
  window.dispatchEvent(new CustomEvent("close-overlay"));
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
