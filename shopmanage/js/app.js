// ===========================
// Global Variables
// ===========================

let products = [];          // Store fetched products
let isEditMode = false;     // Track edit mode status
let currentEditId = null;   // Store current product ID being edited
let modalInstance = null;   // Bootstrap modal instance

// ===========================
// API Configuration
// ===========================

const API_BASE_URL = 'https://dummyjson.com';
const API_ENDPOINTS = {
    getProducts: `${API_BASE_URL}/products?limit=10`,
    getProductById: (id) => `${API_BASE_URL}/products/${id}`,
    addProduct: `${API_BASE_URL}/products/add`,
    updateProduct: (id) => `${API_BASE_URL}/products/${id}`,
    deleteProduct: (id) => `${API_BASE_URL}/products/${id}`
};

// ===========================
// DOM Elements
// ===========================

const productGrid = document.getElementById('productGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');
const productForm = document.getElementById('productForm');
const productModal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');
const saveBtnText = document.getElementById('saveBtnText');
const saveBtnLoader = document.getElementById('saveBtnLoader');

// Form inputs
const productTitle = document.getElementById('productTitle');
const productPrice = document.getElementById('productPrice');
const productCategory = document.getElementById('productCategory');
const productDescription = document.getElementById('productDescription');
const productImage = document.getElementById('productImage');
const productStock = document.getElementById('productStock');

// ===========================
// Initialization
// ===========================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('ShopManage application initialized');
    fetchProducts();
    setupModalInstance();
    setupFormValidation();
});

/**
 * Setup Bootstrap modal instance
 */
function setupModalInstance() {
    modalInstance = new bootstrap.Modal(productModal);
}

/**
 * Setup form validation
 */
function setupFormValidation() {
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!productForm.checkValidity() === false) {
            e.stopPropagation();
        }
        saveProduct();
    });

    // Real-time validation for price
    productPrice.addEventListener('change', () => {
        if (productPrice.value < 0) {
            productPrice.value = '';
        }
    });

    // Real-time validation for stock
    productStock.addEventListener('change', () => {
        if (productStock.value < 0) {
            productStock.value = '';
        }
    });
}

// ===========================
// CRUD OPERATIONS
// ===========================

// ===== READ OPERATIONS =====

/**
 * Fetch products from DummyJSON API
 * @async
 */
async function fetchProducts() {
    try {
        showLoadingSpinner(true);
        console.log('Fetching products from API...');

        const response = await fetch(API_ENDPOINTS.getProducts);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        products = data.products || [];

        console.log(`Successfully fetched ${products.length} products`);
        displayProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        showErrorAlert(`Failed to fetch products: ${error.message}`);
        emptyState.classList.remove('d-none');
    } finally {
        showLoadingSpinner(false);
    }
}

/**
 * Display products in the grid
 */
function displayProducts() {
    if (products.length === 0) {
        productGrid.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');

    productGrid.innerHTML = products.map(product => `
        <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <div class="product-card">
                <div class="product-image-container">
                    ${
                        product.thumbnail
                            ? `<img src="${product.thumbnail}" alt="${product.title}" class="product-image" onerror="this.style.display='none'">`
                            : ''
                    }
                    ${
                        !product.thumbnail || true
                            ? `<div class="product-image-placeholder" ${product.thumbnail ? 'style="display:none;"' : ''}>
                                <i class="fas fa-image"></i>
                            </div>`
                            : ''
                    }
                </div>
                <div class="product-body">
                    <h3 class="product-title">${escapeHtml(product.title)}</h3>
                    <div class="product-category">
                        <span class="badge bg-primary">${escapeHtml(product.category)}</span>
                    </div>
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                    ${
                        product.description
                            ? `<p class="product-description">${escapeHtml(product.description)}</p>`
                            : ''
                    }
                    ${
                        product.stock !== undefined
                            ? `<p class="product-stock">
                                Stock: <span class="stock-badge ${getStockClass(product.stock)}">
                                    ${product.stock > 0 ? product.stock + ' units' : 'Out of Stock'}
                                </span>
                            </p>`
                            : ''
                    }
                    <div class="product-actions">
                        <button class="btn btn-edit" onclick="editProduct(${product.id})" title="Edit product">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-delete" onclick="deleteProduct(${product.id})" title="Delete product">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    console.log('Products displayed successfully');
}

// ===== CREATE OPERATIONS =====

/**
 * Open modal for adding a new product
 */
function openAddModal() {
    resetForm();
    modalTitle.textContent = 'Add Product';
    isEditMode = false;
    currentEditId = null;
    console.log('Opening Add Product modal');
}

/**
 * Add a new product to the inventory
 * @async
 * @param {Object} productData - Product data to add
 */
async function addProduct(productData) {
    try {
        setButtonLoading(true);
        console.log('Adding new product:', productData);

        const response = await fetch(API_ENDPOINTS.addProduct, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newProduct = await response.json();
        console.log('Product added successfully:', newProduct);

        // Add to products array (at the beginning)
        products.unshift(newProduct);
        displayProducts();

        showSuccessAlert('Product Added Successfully!');
        closeModal();
        resetForm();
    } catch (error) {
        console.error('Error adding product:', error);
        showErrorAlert(`Failed to add product: ${error.message}`);
    } finally {
        setButtonLoading(false);
    }
}

// ===== UPDATE OPERATIONS =====

/**
 * Fetch product details for editing
 * @async
 * @param {number} id - Product ID
 */
async function editProduct(id) {
    try {
        showLoadingSpinner(true);
        console.log(`Fetching product details for ID: ${id}`);

        const response = await fetch(API_ENDPOINTS.getProductById(id));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const product = await response.json();
        console.log('Product fetched for editing:', product);

        // Pre-fill form with product data
        productTitle.value = product.title || '';
        productPrice.value = product.price || '';
        productCategory.value = product.category || '';
        productDescription.value = product.description || '';
        productImage.value = product.thumbnail || '';
        productStock.value = product.stock || '';

        // Set modal for edit mode
        modalTitle.textContent = 'Edit Product';
        isEditMode = true;
        currentEditId = id;

        console.log('Form pre-filled for editing');
    } catch (error) {
        console.error('Error fetching product:', error);
        showErrorAlert(`Failed to load product: ${error.message}`);
    } finally {
        showLoadingSpinner(false);
    }
}

/**
 * Update an existing product
 * @async
 * @param {number} id - Product ID
 * @param {Object} productData - Updated product data
 */
async function updateProduct(id, productData) {
    try {
        setButtonLoading(true);
        console.log(`Updating product ID ${id}:`, productData);

        const response = await fetch(API_ENDPOINTS.updateProduct(id), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProduct = await response.json();
        console.log('Product updated successfully:', updatedProduct);

        // Update product in array
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updatedProduct };
        }

        displayProducts();
        showSuccessAlert('Product Updated Successfully!');
        closeModal();
        resetForm();
    } catch (error) {
        console.error('Error updating product:', error);
        showErrorAlert(`Failed to update product: ${error.message}`);
    } finally {
        setButtonLoading(false);
    }
}

// ===== DELETE OPERATIONS =====

/**
 * Delete a product from the inventory
 * @async
 * @param {number} id - Product ID
 */
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        console.log('Delete operation cancelled');
        return;
    }

    try {
        console.log(`Deleting product ID: ${id}`);

        const response = await fetch(API_ENDPOINTS.deleteProduct(id), {
            method: 'DELETE'
        });

        if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Product deleted successfully:', result);

        // Remove from products array
        products = products.filter(p => p.id !== id);
        displayProducts();

        showSuccessAlert('Product Deleted Successfully!');
    } catch (error) {
        console.error('Error deleting product:', error);
        showErrorAlert(`Failed to delete product: ${error.message}`);
    }
}

// ===========================
// Form Management
// ===========================

/**
 * Save product (handles both add and update)
 * @async
 */
async function saveProduct() {
    if (!productForm.checkValidity()) {
        productForm.reportValidity();
        return;
    }

    const productData = {
        title: productTitle.value.trim(),
        price: parseFloat(productPrice.value),
        category: productCategory.value.trim(),
        description: productDescription.value.trim(),
        thumbnail: productImage.value.trim(),
        stock: productStock.value ? parseInt(productStock.value) : 0
    };

    if (isEditMode && currentEditId) {
        await updateProduct(currentEditId, productData);
    } else {
        await addProduct(productData);
    }
}

/**
 * Reset form to initial state
 */
function resetForm() {
    productForm.reset();
    productForm.classList.remove('was-validated');
    productTitle.focus();
}

/**
 * Close modal
 */
function closeModal() {
    if (modalInstance) {
        modalInstance.hide();
    }
}

// ===========================
// UI Helper Functions
// ===========================

/**
 * Show or hide loading spinner
 * @param {boolean} show - Whether to show spinner
 */
function showLoadingSpinner(show) {
    if (show) {
        loadingSpinner.classList.remove('d-none');
    } else {
        loadingSpinner.classList.add('d-none');
    }
}

/**
 * Set button loading state
 * @param {boolean} isLoading - Whether button is loading
 */
function setButtonLoading(isLoading) {
    if (isLoading) {
        saveBtn.disabled = true;
        saveBtnText.classList.add('d-none');
        saveBtnLoader.classList.remove('d-none');
    } else {
        saveBtn.disabled = false;
        saveBtnText.classList.remove('d-none');
        saveBtnLoader.classList.add('d-none');
    }
}

/**
 * Show success alert
 * @param {string} message - Alert message
 */
function showSuccessAlert(message) {
    alert(message); // Can be replaced with toast notification library
    console.log('Success:', message);
}

/**
 * Show error alert
 * @param {string} message - Error message
 */
function showErrorAlert(message) {
    alert(message); // Can be replaced with toast notification library
    console.error('Error:', message);
}

/**
 * Get stock status class
 * @param {number} stock - Stock quantity
 * @returns {string} - CSS class for stock badge
 */
function getStockClass(stock) {
    if (stock <= 0) {
        return 'out-of-stock';
    } else if (stock <= 5) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// Event Listeners
// ===========================

/**
 * Close modal when clicking outside
 */
productModal.addEventListener('hidden.bs.modal', () => {
    resetForm();
    isEditMode = false;
    currentEditId = null;
});

console.log('ShopManage JavaScript loaded successfully');
