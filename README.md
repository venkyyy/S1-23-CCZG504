# S1-23-CCZG504: Microservices Application

## Group Details
### Group 6	
1. **2022mt03574- S S Pavan Kumar Marla**
2. **2022mt03606-LEELA KUMARI A**
3. **2022mt03584-MADHAVAN R**
4. **2022mt03520-VENKATESH KODARI**

This repository contains a set of microservices designed to work together to form a complete application. The application consists of three microservices:

1. **Product Catalog Microservice**
   - Manages the catalog of products available in the system.

2. **User Management Microservice**
   - Handles user-related functionalities, such as user registration and user information retrieval.

3. **Order Processing Microservice**
   - Manages the processing of customer orders.

## Architecture 

![Microservices Architecture](architecture.png)



## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Docker Configuration](#docker-configuration)
  - [Kubernetes Deployment](#kubernetes-deployment)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed
- Docker installed (for local development)
- Kubernetes cluster set up (for deployment)
- MongoDB installed and running locally

## Getting Started

### Docker Configuration

1. Build the Docker images for each microservice:

```bash
   docker build -t dockerhub-username/product-catalog:latest ./product-catalog
   docker build -t dockerhub-username/user-management:latest ./user-management
   docker build -t dockerhub-username/order-processing:latest ./order-processing
```


2. Push the Docker images to DockerHub: 
```bash
    docker push your-dockerhub-username/product-catalog:latest
    docker push your-dockerhub-username/user-management:latest
        docker push your-dockerhub-username/order-processing:latest
```

### Kubernetes Deployment

1. Apply the Kubernetes deployment files:

```bash
    kubectl apply -f product-catalog-deployment.yaml
    kubectl apply -f user-management-deployment.yaml
    kubectl apply -f order-processing-deployment.yaml
```

2. Monitor the deployment:

```bash
kubectl get pods
kubectl get services
```

### Usage

Access the microservices through the exposed services in your Kubernetes cluster.
Use the provided endpoints (documented below) to interact with each microservice.

### Endpoints

#### Product Catalog Microservice

1. GET /products: Retrieve the list of products.
2. GET /products/{id}: Retrieve details of a specific product.
3. POST /products: Add a new product.


#### User Management Microservice

1. GET /users: Retrieve the list of users.
2. GET /users/{id}: Retrieve details of a specific user.
3. POST /users: Add a new user.


#### Order Processing Microservice

1. GET /orders: Retrieve the list of orders.
2. GET /orders/{id}: Retrieve details of a specific order.
3. POST /orders: Place a new order.

### Development

- Each microservice is developed independently.
- Follow the development guidelines in each microservice directory.






