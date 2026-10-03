package com.autohublanka.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Customer sign-up only accepts Gmail addresses (name@gmail.com).
 * The part before @ may contain letters, digits, dots, +, _ and - (no dot at the start/end, no "..").
 * Staff and supplier accounts are created by the admin / procurement and only need a valid format (@ValidEmail).
 * Same rule in React: src/utils/validation.js.
 */
@Documented
@Constraint(validatedBy = {})
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
@ReportAsSingleViolation
@Pattern(regexp = GmailAddress.REGEX, flags = Pattern.Flag.CASE_INSENSITIVE)
public @interface GmailAddress {

    String REGEX = "^$|^[A-Za-z0-9_%+-]+(\\.[A-Za-z0-9_%+-]+)*@gmail\\.com$";

    String message() default "Please use a valid Gmail address (e.g. name@gmail.com)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
