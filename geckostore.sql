Create database geckostore;
use geckostore;



drop table if exists users;
create table users(
  id int(11) not null AUTO_INCREMENT primary key,
  email varchar(100) unique not null,
  password varchar(255) not null,
  role varchar(20) not null default 'Customer',
  firstName varchar(50),
  lastName varchar(50),
  phoneExt varchar(10) default '+60',
  phone int(20),
  add1 text,
  city varchar(50),
  state varchar(50),
  zip varchar(20),
  country varchar(20) default 'Malaysia'
);

INSERT INTO users (email, password, role, firstName, lastName) VALUES
('admin@system.com', 'admin123', 'admin', 'Admin', ''),
('customer@example.com', 'password123', 'customer', 'Test', 'Customer'),
('test@gmail.com', 'Test123', 'customer', 'Test', '');



drop table if exists categories;
CREATE TABLE categories (
  id int(11) AUTO_INCREMENT NOT NULL PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text
);

INSERT INTO categories (`name`) VALUES
('Geckos'),
('Enclosures'),
('Food');



drop table if exists products;
create table products(
  id int(11) auto_increment not null primary key,
  name varchar(150) not null,
  price decimal(10,2) not null,
  stock int(11) not null,
  category_id int(11) default null,
  description text,
  image varchar(200),

  foreign key (category_id)
  references categories(id)
  on delete set null
);

INSERT INTO products (name, price, stock, category_id, description, image) VALUES
('Leopard Gecko', 200.00, 10, 1, 'A healthy captive-bred Leopard Gecko. Perfect for beginners.', 'img/Leopard_Gecko.jpeg'),
('Crested Gecko (Harlequin)', 160.00, 3, 1, 'Beautiful arboreal gecko with striking patterns.', 'img/Crested_Gecko.jpeg'),
('Gargoyle Gecko (Striped)', 700.00, 1, 1, 'Hardy and stunning striped gecko.', 'img/Gargoyle_Gecko.jpeg'),
('African Fat-Tailed Gecko', 300.00, 6, 1, 'Docile and friendly terrestrial gecko.', 'img/African_Fat_Tailed_Gecko.jpeg'),
('Premium Glass Terrarium', 150.00, 8, 2, 'Spacious 75-liter front-opening glass terrarium.', 'img/Premium_Glass_Terrarium.jpeg'),
('Tall Arboreal Enclosure', 120.00, 4, 2, 'Perfectly sized for climbing species.', 'img/Tall_Arboreal_Enclosure.jpeg'),
('Digital Thermometer & Hygrometer', 58.88, 45, 2, 'Accurately monitor temperature and humidity.', 'img/Digital_Thermometer_and_Hygrometer.jpeg'),
('Natural Cork Bark Tubes', 25.00, 35, 2, 'Provides a secure hiding spot.', 'img/Natural_Cork_Bark_Tubes.jpeg'),
('Live Mealworms (500-Count)', 10.00, 50, 3, 'Nutritious live mealworms.', 'img/Live_Mealworms.jpeg'),
('Live Dubia Roaches (200-Count)', 45.00, 15, 3, 'High-protein, low-chitin feeder insects.', 'img/Live_Dubia_Roaches.jpeg'),
('Crested Gecko Diet (Watermelon)', 75.99, 30, 3, 'Complete meal replacement powder.', 'img/Crested_Gecko_Diet.jpeg'),
('Calcium + D3 Supplement', 89.99, 100, 3, 'Essential vitamin powder.', 'img/Calcium_and_D3_Supplement.jpeg');



drop table if exists orders;
CREATE TABLE orders (
  id int(11) not null AUTO_INCREMENT PRIMARY key,
  user_id int(11) default null,
  date datetime default current_timestamp,
  total decimal(10,2) not null,
  status varchar(50) default 'Processing',
  paymentName varchar(100) not null,
  items JSON not null,

  foreign key (user_id)
  REFERENCES users (id)
  on delete cascade
);



drop table if exists comments;
CREATE TABLE `comments` (
  id int(11) AUTO_INCREMENT NOT NULL PRIMARY KEY,
  product_id int(11) NOT NULL,
  user_id int(11) DEFAULT NULL,
  title varchar(150) NOT NULL,
  body text NOT NULL,
  date datetime DEFAULT current_timestamp(),

  foreign key (product_id)
  REFERENCES products (id)
  on delete cascade,

  foreign key (user_id)
  REFERENCES users(id)
  on delete set null
);
