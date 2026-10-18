
const imageInput = document.getElementById("imageInput");
const editor = document.getElementById("editor");
const previewImage = document.getElementById("previewImage");

const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const ratioInput = document.getElementById("ratioInput");

const resizeButton = document.getElementById("resizeButton");
const downloadButton = document.getElementById("downloadButton");
const statusMessage = document.getElementById("statusMessage");

const formatInput = document.getElementById("formatInput");
const qualityInput = document.getElementById("qualityInput");
const qualityGroup = document.getElementById("qualityGroup");
const qualityValue = document.getElementById("qualityValue");

const currentYear = document.getElementById("currentYear");

let originalImage = null;
let originalFileName = "resized-image";
let originalWidth = 0;
let originalHeight = 0;

let originalImageURL = null;
let resizedImageURL = null;
let resizedImageFormat = "image/png";

let uploadVersion = 0;
let resizeVersion = 0;

// UPDATE THE FOOTER YEAR
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

// INITIAL BUTTON STATE
downloadButton.disabled = true;
downloadButton.hidden = true;
editor.hidden = true;

// UPDATE FORMAT SETTINGS
function updateFormatSettings() {
    const isPNG = formatInput.value === "image/png";

    qualityGroup.hidden = isPNG;
}

function invalidateResizedImage() {
    resizeVersion++;

    if (resizedImageURL) {
        URL.revokeObjectURL(resizedImageURL);
        resizedImageURL = null;
    }

    downloadButton.disabled = true;
    downloadButton.hidden = true;

    if (originalImageURL && originalImage) {
        previewImage.src = originalImageURL;
    }
}

formatInput.addEventListener("change", function () {
    updateFormatSettings();
    invalidateResizedImage();

    if (originalImage) {
        statusMessage.textContent =
            "Format changed. Resize again to apply your changes.";
    }
});

qualityInput.addEventListener("input", function () {
    qualityValue.textContent = qualityInput.value + "%";

    invalidateResizedImage();

    if (originalImage) {
        statusMessage.textContent =
            "Quality changed. Resize again to apply your changes.";
    }
});

updateFormatSettings();

// UPLOAD AN IMAGE
imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        statusMessage.textContent =
            "Please select a valid image file.";
        imageInput.value = "";
        return;
    }

    uploadVersion++;
    const currentUploadVersion = uploadVersion;

    invalidateResizedImage();

    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
        originalImageURL = null;
    }

    originalImage = null;
    originalWidth = 0;
    originalHeight = 0;

    editor.hidden = true;
    resizeButton.disabled = true;

    const imageURL = URL.createObjectURL(file);
    originalImageURL = imageURL;

    const newImage = new Image();

    newImage.onload = function () {
        if (currentUploadVersion !== uploadVersion) {
            URL.revokeObjectURL(imageURL);
            return;
        }

        originalImage = newImage;

        originalWidth = newImage.naturalWidth;
        originalHeight = newImage.naturalHeight;

        originalFileName = file.name.replace(/\.[^/.]+$/, "");

        previewImage.src = imageURL;

        widthInput.value = originalWidth;
        heightInput.value = originalHeight;

        editor.hidden = false;
        resizeButton.disabled = false;

        statusMessage.textContent =
            "Image uploaded successfully! Choose your settings.";
    };

    newImage.onerror = function () {
        if (currentUploadVersion !== uploadVersion) {
            URL.revokeObjectURL(imageURL);
            return;
        }

        URL.revokeObjectURL(imageURL);
        originalImageURL = null;
        originalImage = null;

        statusMessage.textContent =
            "Could not load this image. Please try another file.";

        imageInput.value = "";
    };

    newImage.src = imageURL;
});

// KEEP ASPECT RATIO WHEN WIDTH CHANGES
widthInput.addEventListener("input", function () {
    if (!ratioInput.checked || originalWidth === 0) {
        return;
    }

    const newWidth = Number(widthInput.value);

    if (newWidth > 0) {
        heightInput.value = Math.round(
            (newWidth / originalWidth) * originalHeight
        );
    }
});

// KEEP ASPECT RATIO WHEN HEIGHT CHANGES
heightInput.addEventListener("input", function () {
    if (!ratioInput.checked || originalHeight === 0) {
        return;
    }

    const newHeight = Number(heightInput.value);

    if (newHeight > 0) {
        widthInput.value = Math.round(
            (newHeight / originalHeight) * originalWidth
        );
    }
});

// RESIZE THE IMAGE
resizeButton.addEventListener("click", function () {
    if (!originalImage || !originalWidth || !originalHeight) {
        statusMessage.textContent =
            "Please upload an image first.";
        return;
    }

    const newWidth = Number(widthInput.value);
    const newHeight = Number(heightInput.value);

    if (
        !Number.isInteger(newWidth) ||
        !Number.isInteger(newHeight) ||
        newWidth < 1 ||
        newHeight < 1
    ) {
        statusMessage.textContent =
            "Enter a valid width and height greater than zero.";
        return;
    }

    if (newWidth > 10000 || newHeight > 10000) {
        statusMessage.textContent =
            "Please use dimensions of 10,000 pixels or less.";
        return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        statusMessage.textContent =
            "Your browser could not start the image editor.";
        return;
    }

    const selectedFormat = formatInput.value;
    const quality = Number(qualityInput.value) / 100;

    const thisResizeVersion = ++resizeVersion;
    const thisUploadVersion = uploadVersion;

    canvas.width = newWidth;
    canvas.height = newHeight;

    // JPEG does not support transparency, so use a white background.
    if (selectedFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, newWidth, newHeight);
    }

    context.drawImage(
        originalImage,
        0,
        0,
        newWidth,
        newHeight
    );

    statusMessage.textContent = "Resizing your image...";

    resizeButton.disabled = true;
    downloadButton.disabled = true;
    downloadButton.hidden = true;

    canvas.toBlob(
        function (blob) {
            if (
                thisResizeVersion !== resizeVersion ||
                thisUploadVersion !== uploadVersion
            ) {
                return;
            }

            resizeButton.disabled = false;

            if (!blob) {
                statusMessage.textContent =
                    "Could not resize this image. Please try again.";
                return;
            }

            if (resizedImageURL) {
                URL.revokeObjectURL(resizedImageURL);
            }

            resizedImageFormat = blob.type || "image/png";
            resizedImageURL = URL.createObjectURL(blob);

            previewImage.src = resizedImageURL;

            downloadButton.disabled = false;
            downloadButton.hidden = false;

            if (resizedImageFormat !== selectedFormat) {
                statusMessage.textContent =
                    "Your browser used a different format. Your image is ready to download.";
            } else {
                statusMessage.textContent =
                    "Image resized successfully! You can download it now.";
            }
        },
        selectedFormat,
        selectedFormat === "image/png" ? undefined : quality
    );
});

// DOWNLOAD THE RESIZED IMAGE
downloadButton.addEventListener("click", function () {
    if (!resizedImageURL) {
        statusMessage.textContent =
            "Please resize your image before downloading.";
        return;
    }

    const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp"
    };

    const extension = extensions[resizedImageFormat] || "png";

    const downloadLink = document.createElement("a");

    downloadLink.href = resizedImageURL;
    downloadLink.download =
        originalFileName + "-resized." + extension;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    statusMessage.textContent = "Your download has started!";
});

// RELEASE TEMPORARY IMAGE URLS WHEN LEAVING
window.addEventListener("beforeunload", function () {
    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
    }

    if (resizedImageURL) {
        URL.revokeObjectURL(resizedImageURL);
    }
});
