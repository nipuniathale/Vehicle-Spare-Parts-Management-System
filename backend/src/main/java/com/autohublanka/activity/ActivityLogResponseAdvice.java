package com.autohublanka.activity;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.RecordComponent;

/**
 * Remembers the id and status of the record a change endpoint returned (e.g. the id of a newly created
 * purchase order), so the activity log can say "Created purchase order #12".
 */
@ControllerAdvice
public class ActivityLogResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return returnType.getParameterType().isRecord();
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body != null && body.getClass().isRecord() && request instanceof ServletServerHttpRequest servlet
                && !"GET".equals(servlet.getServletRequest().getMethod())) {
            for (RecordComponent component : body.getClass().getRecordComponents()) {
                try {
                    Object value = component.getAccessor().invoke(body);
                    if (component.getName().equals("id") && value instanceof Long id) {
                        servlet.getServletRequest().setAttribute(ActivityLogInterceptor.ENTITY_ID, id);
                    } else if (component.getName().equals("status") && value != null) {
                        servlet.getServletRequest().setAttribute(ActivityLogInterceptor.ENTITY_STATUS, value.toString());
                    }
                } catch (ReflectiveOperationException ignored) {
                    // not important for the log
                }
            }
        }
        return body;
    }
}
