package com.autohublanka.common.exception;

/** 400 - the request is well formed but breaks a business rule. */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
