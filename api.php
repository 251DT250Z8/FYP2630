<?php
define('PETTOY_SUB_API', true);
require_once __DIR__ . '/../api.php';

function requireCustomer($pdo, $input) {
    $authUser = requireAuth($pdo, $input);
    if (($authUser['account_type'] ?? 'users') !== 'users') {
        echo json_encode(["success" => false, "error" => "Customer account required."]);
        exit();
    }
    return $authUser;
}

try {
    if (handleSharedApiAction($pdo, $action, $input)) {
        exit();
    }

    switch ($action) {
        case 'updateProfile':
            handleProfileUpdateShared($pdo, $input);
            break;

        case 'getCart':
            $authUser = requireCustomer($pdo, $input);
            $stmt = $pdo->prepare("SELECT cart FROM users WHERE id = ?");
            $stmt->execute([$authUser['id']]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "cart" => (!empty($row['cart']) ? json_decode($row['cart']) : [])]);
            break;

        case 'updateCart':
            $authUser = requireCustomer($pdo, $input);
            $cartItems = is_array($input['cart'] ?? null) ? $input['cart'] : [];
            $stmt = $pdo->prepare("UPDATE users SET cart = ? WHERE id = ?");
            $stmt->execute([json_encode($cartItems), $authUser['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'addOrder':
            $authUser = requireCustomer($pdo, $input);
            $o = $input['order'] ?? [];
            $items = $o['items'] ?? [];

            if (empty($items) || !is_array($items)) {
                echo json_encode(["success" => false, "error" => "Order must contain at least one item."]);
                break;
            }

            $trackingRef = 'JT-MY-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
            $shippingName = trim($o['shipping_name'] ?? $o['paymentName'] ?? '');
            $shippingPhone = trim($o['shipping_phone'] ?? '');
            $shippingAddress = trim($o['shipping_address'] ?? '');
            $shippingCity = trim($o['shipping_city'] ?? '');
            $shippingState = trim($o['shipping_state'] ?? 'Melaka');
            $shippingPostcode = trim($o['shipping_postcode'] ?? '');
            $trackingNumber = !empty($o['tracking_number']) ? trim($o['tracking_number']) : $trackingRef;
            $courier = trim($o['courier'] ?? 'J&T Express');

            if ($shippingName === '' || $shippingPhone === '' || $shippingAddress === '' || $shippingCity === '' || $shippingPostcode === '') {
                echo json_encode(["success" => false, "error" => "Incomplete delivery address or contact details."]);
                break;
            }

            $pdo->beginTransaction();
            try {
                $verifiedItems = [];
                $subtotal = 0.0;

                $lockStmt = $pdo->prepare("SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE");
                $decStmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

                foreach ($items as $item) {
                    $prodId = intval($item['id'] ?? 0);
                    $qty = intval($item['quantity'] ?? 0);
                    if ($prodId <= 0 || $qty <= 0) {
                        throw new Exception("Invalid item quantity in cart.");
                    }

                    $lockStmt->execute([$prodId]);
                    $prod = $lockStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$prod) {
                        throw new Exception("One of the products in your cart is no longer available.");
                    }
                    if (intval($prod['stock']) < $qty) {
                        throw new Exception("Insufficient stock for \"" . $prod['name'] . "\" (only " . intval($prod['stock']) . " left).");
                    }

                    $unitPrice = floatval($prod['price']);
                    $subtotal += $unitPrice * $qty;
                    $verifiedItems[] = [
                        'id' => (string)$prodId,
                        'name' => $prod['name'],
                        'price' => $unitPrice,
                        'quantity' => $qty
                    ];

                    $decStmt->execute([$qty, $prodId]);
                }

                $shippingFee = $subtotal >= 80.0 ? 0.00 : 8.00;
                $finalTotal = round($subtotal + ($subtotal * 0.06) + $shippingFee, 2);

                $stmt = $pdo->prepare("INSERT INTO orders (user_id, total, status, paymentName, fulfillment_type, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_postcode, shipping_fee, tracking_number, courier, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $authUser['id'],
                    $finalTotal,
                    'Processing',
                    $shippingName,
                    'delivery',
                    $shippingName,
                    $shippingPhone,
                    $shippingAddress,
                    $shippingCity,
                    $shippingState,
                    $shippingPostcode,
                    $shippingFee,
                    $trackingNumber,
                    $courier,
                    json_encode($verifiedItems)
                ]);
                $orderId = $pdo->lastInsertId();

                $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
                foreach ($verifiedItems as $vi) {
                    $itemStmt->execute([$orderId, intval($vi['id']), $vi['quantity'], $vi['price'], $vi['quantity'] * $vi['price']]);
                }

                $pdo->prepare("UPDATE users SET cart = '[]' WHERE id = ?")->execute([$authUser['id']]);
                $pdo->commit();

                echo json_encode([
                    "success" => true,
                    "order_id" => $orderId,
                    "tracking_number" => $trackingNumber,
                    "courier" => $courier,
                    "stockDecremented" => true
                ]);
            } catch (Exception $txEx) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                echo json_encode(["success" => false, "error" => $txEx->getMessage()]);
            }
            break;

        case 'updateProductStock':
            requireStaffOrAdmin($pdo, $input);
            $qty = max(0, intval($input['qty'] ?? 0));
            $stmt = $pdo->prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?");
            $stmt->execute([$qty, $input['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'addComment':
            $authUser = requireCustomer($pdo, $input);
            $c = $input['comment'] ?? [];
            $prodId = intval($c['product_id'] ?? 0);
            $title = trim($c['title'] ?? '');
            $body = trim($c['body'] ?? '');
            $rating = max(1, min(5, intval($c['rating'] ?? 5)));

            if ($prodId <= 0 || $title === '' || $body === '') {
                echo json_encode(["success" => false, "error" => "Product, review title, and review content are required."]);
                break;
            }

            $chkProd = $pdo->prepare("SELECT id FROM products WHERE id = ?");
            $chkProd->execute([$prodId]);
            if ($chkProd->rowCount() === 0) {
                echo json_encode(["success" => false, "error" => "Product not found."]);
                break;
            }

            $stmt = $pdo->prepare("INSERT INTO comments (product_id, user_id, title, body, rating) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$prodId, $authUser['id'], $title, $body, $rating]);
            echo json_encode(["success" => true]);
            break;

        case 'submitContact':
            handleContactSubmissionShared($pdo, $input);
            break;

        case 'confirmDelivery':
            $authUser = requireCustomer($pdo, $input);
            $orderId = intval($input['order_id'] ?? ($input['id'] ?? 0));
            if ($orderId <= 0) {
                echo json_encode(["success" => false, "error" => "Invalid order ID."]);
                break;
            }
            $stmt = $pdo->prepare("SELECT id, user_id, status FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $ord = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$ord || (string)$ord['user_id'] !== (string)$authUser['id']) {
                echo json_encode(["success" => false, "error" => "Order not found."]);
                break;
            }
            if (strcasecmp(trim((string)$ord['status']), 'Shipped') !== 0) {
                echo json_encode(["success" => false, "error" => "Only shipped orders can be confirmed as delivered."]);
                break;
            }
            $pdo->prepare("UPDATE orders SET status = 'Delivered' WHERE id = ?")->execute([$orderId]);
            echo json_encode(["success" => true, "status" => "Delivered"]);
            break;

        case 'cancelOrder':
            $authUser = requireCustomer($pdo, $input);
            $orderId = intval($input['order_id'] ?? ($input['id'] ?? 0));
            if ($orderId <= 0) {
                echo json_encode(["success" => false, "error" => "Invalid order ID."]);
                break;
            }
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("SELECT id, user_id, status, items FROM orders WHERE id = ? FOR UPDATE");
                $stmt->execute([$orderId]);
                $ord = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$ord || (string)$ord['user_id'] !== (string)$authUser['id']) {
                    throw new Exception("Order not found.");
                }
                if (strcasecmp(trim((string)$ord['status']), 'Processing') !== 0) {
                    throw new Exception("Only Processing orders can be cancelled.");
                }

                $oiStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                $oiStmt->execute([$orderId]);
                $restored = false;
                $incStmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
                foreach ($oiStmt->fetchAll(PDO::FETCH_ASSOC) as $oi) {
                    $incStmt->execute([intval($oi['quantity']), intval($oi['product_id'])]);
                    $restored = true;
                }
                if (!$restored && !empty($ord['items'])) {
                    $decoded = is_string($ord['items']) ? json_decode($ord['items'], true) : $ord['items'];
                    if (is_array($decoded)) {
                        foreach ($decoded as $it) {
                            $pid = intval($it['id'] ?? 0);
                            $qty = intval($it['quantity'] ?? 0);
                            if ($pid > 0 && $qty > 0) $incStmt->execute([$qty, $pid]);
                        }
                    }
                }
                $pdo->prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?")->execute([$orderId]);
                $pdo->commit();
                echo json_encode(["success" => true, "status" => "Cancelled"]);
            } catch (Exception $txEx) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                echo json_encode(["success" => false, "error" => $txEx->getMessage()]);
            }
            break;

        case 'getInquiryMessages':
            $authUser = requireCustomer($pdo, $input);
            autoCloseStaleInquiries($pdo);
            $inqId = intval($input['inquiry_id'] ?? 0);
            $stmt = $pdo->prepare("SELECT * FROM inquiries WHERE id = ?");
            $stmt->execute([$inqId]);
            $inq = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inq || ((string)($inq['user_id'] ?? '') !== (string)$authUser['id'] && strtolower($inq['email'] ?? '') !== strtolower($authUser['email'] ?? ''))) {
                echo json_encode(["success" => false, "error" => "Chat not found."]);
                break;
            }
            $mStmt = $pdo->prepare("SELECT * FROM inquiry_messages WHERE inquiry_id = ? ORDER BY id ASC");
            $mStmt->execute([$inqId]);
            echo json_encode(["success" => true, "inquiry" => $inq, "messages" => $mStmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'sendInquiryReply':
            $authUser = requireCustomer($pdo, $input);
            autoCloseStaleInquiries($pdo);
            $inqId = intval($input['inquiry_id'] ?? 0);
            $msg = trim($input['message'] ?? '');
            if ($inqId <= 0 || $msg === '') {
                echo json_encode(["success" => false, "error" => "Message cannot be empty."]);
                break;
            }
            $stmt = $pdo->prepare("SELECT * FROM inquiries WHERE id = ?");
            $stmt->execute([$inqId]);
            $inq = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inq || ((string)($inq['user_id'] ?? '') !== (string)$authUser['id'] && strtolower($inq['email'] ?? '') !== strtolower($authUser['email'] ?? ''))) {
                echo json_encode(["success" => false, "error" => "Chat not found."]);
                break;
            }
            if ($inq['status'] === 'Ended') {
                echo json_encode(["success" => false, "error" => "This chat has already ended."]);
                break;
            }
            $senderName = trim(($authUser['firstName'] ?? '') . ' ' . ($authUser['lastName'] ?? '')) ?: $inq['name'];
            $pdo->prepare("INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_name, message) VALUES (?, 'customer', ?, ?)")
                ->execute([$inqId, $senderName, $msg]);
            $pdo->prepare("UPDATE inquiries SET last_customer_reply_at = NOW() WHERE id = ?")->execute([$inqId]);
            echo json_encode(["success" => true]);
            break;

        case 'endInquiryChat':
            $authUser = requireCustomer($pdo, $input);
            $inqId = intval($input['inquiry_id'] ?? 0);
            $stmt = $pdo->prepare("SELECT * FROM inquiries WHERE id = ?");
            $stmt->execute([$inqId]);
            $inq = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inq || ((string)($inq['user_id'] ?? '') !== (string)$authUser['id'] && strtolower($inq['email'] ?? '') !== strtolower($authUser['email'] ?? ''))) {
                echo json_encode(["success" => false, "error" => "Chat not found."]);
                break;
            }
            $pdo->prepare("UPDATE inquiries SET status = 'Ended' WHERE id = ?")->execute([$inqId]);
            echo json_encode(["success" => true, "status" => "Ended"]);
            break;

        default:
            echo json_encode(["success" => false, "error" => "Invalid action for Customer API."]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Database Query Error: " . $e->getMessage()]);
}
