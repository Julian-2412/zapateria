let products = []; // Definir products como variable global

fetch('http://localhost:3000/api/productos')
    .then(response => response.json())
    .then(data => {
        products = data; // Asigna los datos a la variable products
        loadProducts();  // Llama a loadProducts para cargar los productos en el HTML
    })
    .catch(error => console.error('Error al obtener los productos:', error));


let cart = [];

// Cargar productos
function loadProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = ''; // Limpia el contenedor

    // <img src="${product.image}" alt="${product.name}" class="product-image">

    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            
            <img src="${product.image}" alt="${product.name}" class="product-image">

            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">$${product.price} <br> Unidades disponibles: ${product.stock}</p>
            <div class="product-options">
                <select id="size-${product.id}">
                    <option value="">Selecciona una talla</option>
                    ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                </select>
                <input type="number" id="quantity-${product.id}" min="1" max="${product.stock}" value="1">
            </div>
            <button onclick="addToCart(${product.id})" class="add-to-cart">
                Añadir al Carrito
            </button>
        `;
        container.appendChild(productElement);
    });
}




//----------------------------------------
function showModal(message) {
    const modal = document.getElementById('warning-modal');
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = message;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('warning-modal');
    modal.style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('warning-modal');
    if (event.target === modal) {
        closeModal();  // Cerrar el modal si el clic fue fuera de la ventana del modal
    }
}

// Añadir al carrito
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const sizeSelect = document.getElementById(`size-${productId}`);
    const quantityInput = document.getElementById(`quantity-${productId}`);
    
    const size = sizeSelect.value;
    const quantity = parseInt(quantityInput.value);

    if (!size) {
        showModal('Por favor selecciona una talla');
        return;
    }

    if (!quantity || quantity < 1) {
        showModal('Por favor selecciona una cantidad válida');
        return;
    }

    if (quantity > product.stock) {
        showModal('La cantidad seleccionada excede las unidades disponible');
        return;
    }

    const cartItemIndex = cart.findIndex(item => 
        item.id === productId && item.size === size
    );

    if (cartItemIndex !== -1) {
        cart[cartItemIndex].quantity += quantity;
    } else {
        cart.push({...product, size, quantity});
    }

    updateCartCount();
    updateCartDisplay();
    
    // Resetear valores
    sizeSelect.value = '';
    quantityInput.value = 1;
}


// Actualizar contador del carrito
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelector('.cart-count').textContent = count;
}

// Mostrar/ocultar carrito
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    updateCartDisplay();
}

// Actualizar visualización del carrito
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';

    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>Talla: ${item.size}</p>
                <p>$${item.price} x ${item.quantity}</p>
            </div>
            <div class="cart-item-actions">
                <button class="quantity-btn" onclick="decrementQuantity(${item.id}, '${item.size}')">-</button>
                <button class="quantity-btn" onclick="removeFromCart(${item.id}, '${item.size}')">🗑️</button>
            </div>
        `;
        cartItems.appendChild(itemElement);
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('total-amount').textContent = total.toFixed(2);
}

// Decrementar cantidad
function decrementQuantity(productId, size) {
    const itemIndex = cart.findIndex(item => 
        item.id === productId && item.size === size
    );
    
    if (itemIndex !== -1) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity--;
        } else {
            cart.splice(itemIndex, 1);
        }
        updateCartCount();
        updateCartDisplay();
    }
}

// Eliminar un producto específico del carrito
function removeFromCart(productId, size) {
    const itemIndex = cart.findIndex(item => 
        item.id === productId && item.size === size
    );
    
    if (itemIndex !== -1) {
        cart.splice(itemIndex, 1);
        updateCartCount();
        updateCartDisplay();
    }
}

// Eliminar todos los productos de un tipo específico
function removeAllFromCart(productId, size) {
    cart = cart.filter(item => !(item.id === productId && item.size === size));
    updateCartCount();
    updateCartDisplay();
}

// Realizar pedido
async function checkout() {
    if (cart.length === 0) {
        showModal('El carrito está vacío');
        return;
    }
    
    const userPhone = document.getElementById("userPhone")
    if (!userPhone.value) {
        showModal('Es necesario proporcionar un número de teléfono');
        return;
    }

    // Mostrar modal de carga
    showModal('Procesando tu pedido...');

    try {
        const response = await fetch('http://localhost:3000/api/procesar-pedido', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                cart: cart,
                userPhone: userPhone
            })
        });

        // Verificar si la respuesta es JSON válido
        const data = await response.json();

        if (response.ok && data.success) {
            showModal(`¡Gracias por tu compra! 
                      Te contactaremos al ${userPhone.value}
                      Total: $${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}`);
            
            cart = [];
            updateCartCount();
            toggleCart();
            
            // Recargar productos
            await loadProducts();
            setTimeout(() => {
                window.location.reload();
            }, 3000); // 20,000 milisegundos = 20 segundos
        } else {
            showModal('Error: ' + (data.error || 'No se pudo procesar el pedido'));
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error al procesar el pedido. Por favor, intenta nuevamente.');
    }
}

// Filtrar productos por nombre y precio
function filterProducts() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const maxPrice = parseFloat(document.getElementById('price-input').value);

    // Limpiar y cargar productos
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    products.forEach(product => {
    const matchesText = product.name.toLowerCase().includes(searchText);
    const matchesPrice = !isNaN(maxPrice) ? product.price <= maxPrice : true;

    if (matchesText && matchesPrice) {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-price">$${product.price} <br> Unidades disponibles: ${product.stock}</p>
            <div class="product-options">
                <select id="size-${product.id}">
                    <option value="">Selecciona una talla</option>
                    ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                </select>
                <input type="number" id="quantity-${product.id}" min="1" max="${product.stock}" value="1">
            </div>
            <button onclick="addToCart(${product.id})" class="add-to-cart">
                Añadir al Carrito
            </button>
        `;
        container.appendChild(productElement);
    }
    });
}

// Cargar productos inicialmente
loadProducts();



// Inicializar la aplicación
loadProducts();