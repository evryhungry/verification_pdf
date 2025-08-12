package com.hiswork.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hiswork.backend.domain.Document;
import com.hiswork.backend.domain.DocumentRole;
import com.hiswork.backend.domain.Template;
import com.hiswork.backend.domain.TasksLog;
import com.hiswork.backend.domain.User;
import com.hiswork.backend.dto.DocumentUpdateRequest;
import com.hiswork.backend.repository.DocumentRepository;
import com.hiswork.backend.repository.DocumentRoleRepository;
import com.hiswork.backend.repository.TemplateRepository;
import com.hiswork.backend.repository.TasksLogRepository;
import com.hiswork.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {
    
    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);
    
    private final DocumentRepository documentRepository;
    private final TemplateRepository templateRepository;
    private final DocumentRoleRepository documentRoleRepository;
    private final TasksLogRepository tasksLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder;
    
    public Document createDocument(Long templateId, User creator, String editorEmail) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        
        // 새로운 구조와 기존 구조 모두 지원
        ObjectNode initialData = initializeDocumentData(template);
        
        Document document = Document.builder()
                .template(template)
                .data(initialData)
                .status(Document.DocumentStatus.DRAFT)
                .build();
        
        document = documentRepository.save(document);
        
        // 생성자 역할 할당
        DocumentRole creatorRole = DocumentRole.builder()
                .document(document)
                .assignedUser(creator)
                .taskRole(DocumentRole.TaskRole.CREATOR)
                .build();
        
        documentRoleRepository.save(creatorRole);
        
        // 생성자 작업 로그
        TasksLog creatorTask = TasksLog.builder()
                .document(document)
                .assignedBy(creator)
                .assignedUser(creator)
                .status(TasksLog.TaskStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .build();
        
        tasksLogRepository.save(creatorTask);
        
        // 편집자가 지정된 경우 편집자 역할 할당
        if (editorEmail != null && !editorEmail.trim().isEmpty()) {
            User editor = getUserOrCreate(editorEmail, "Editor User");
            
            DocumentRole editorRole = DocumentRole.builder()
                    .document(document)
                    .assignedUser(editor)
                    .taskRole(DocumentRole.TaskRole.EDITOR)
                    .build();
            
            documentRoleRepository.save(editorRole);
            
            // 편집자 작업 로그
            TasksLog editorTask = TasksLog.builder()
                    .document(document)
                    .assignedBy(creator)
                    .assignedUser(editor)
                    .status(TasksLog.TaskStatus.PENDING)
                    .build();
            
            tasksLogRepository.save(editorTask);
            
            // 문서 상태를 EDITING으로 변경
            document.setStatus(Document.DocumentStatus.EDITING);
            document = documentRepository.save(document);
        }
        
        return document;
    }
    
    private ObjectNode initializeDocumentData(Template template) {
        ObjectNode data = objectMapper.createObjectNode();
        
        // 기본 필드 초기화
        data.put("title", "");
        data.put("content", "");
        data.put("createdAt", LocalDateTime.now().toString());
        
        // 템플릿에서 coordinateFields 복사 (레거시 지원용)
        if (template.getCoordinateFields() != null && !template.getCoordinateFields().trim().isEmpty()) {
            try {
                JsonNode coordinateFieldsJson = objectMapper.readTree(template.getCoordinateFields());
                if (coordinateFieldsJson.isArray()) {
                    // coordinateFields를 값만 빈 상태로 복사
                    ArrayNode fieldsArray = objectMapper.createArrayNode();
                    for (JsonNode field : coordinateFieldsJson) {
                        ObjectNode fieldCopy = field.deepCopy();
                        fieldCopy.put("value", ""); // 값은 빈 문자열로 초기화
                        fieldsArray.add(fieldCopy);
                    }
                    data.set("coordinateFields", fieldsArray);
                    log.info("문서 생성 시 템플릿의 coordinateFields 복사: {} 개 필드", fieldsArray.size());
                }
            } catch (Exception e) {
                log.warn("템플릿 coordinateFields 파싱 실패: {}", e.getMessage());
            }
        }
        
        return data;
    }
    
    public Document updateDocumentData(Long documentId, DocumentUpdateRequest request, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 권한 확인
        if (!isCreator(document, user) && !isEditor(document, user)) {
            throw new RuntimeException("문서를 수정할 권한이 없습니다");
        }
        
        // 문서 데이터 업데이트
        document.setData(request.getData());
        document = documentRepository.save(document);
        
        // 작업 로그 추가
        TasksLog updateLog = TasksLog.builder()
                .document(document)
                .assignedBy(user)
                .assignedUser(user)
                .status(TasksLog.TaskStatus.IN_PROGRESS)
                .build();
        
        tasksLogRepository.save(updateLog);
        
        return document;
    }
    
    public Document submitForReview(Long documentId, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 편집자 또는 생성자만 검토 요청 가능
        if (!isEditor(document, user) && !isCreator(document, user)) {
            throw new RuntimeException("검토 요청할 권한이 없습니다");
        }
        
        // 현재 상태가 EDITING이어야 함
        if (document.getStatus() != Document.DocumentStatus.EDITING) {
            throw new RuntimeException("문서가 편집 상태가 아닙니다");
        }
        
        // 상태를 READY_FOR_REVIEW로 변경
        document.setStatus(Document.DocumentStatus.READY_FOR_REVIEW);
        document = documentRepository.save(document);
        
        // 작업 로그 추가
        TasksLog reviewRequestLog = TasksLog.builder()
                .document(document)
                .assignedBy(user)
                .assignedUser(user)
                .status(TasksLog.TaskStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .build();
        
        tasksLogRepository.save(reviewRequestLog);
        
        return document;
    }
    
    public Document assignEditor(Long documentId, String editorEmail, User assignedBy) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 생성자만 편집자 할당 가능
        if (!isCreator(document, assignedBy)) {
            throw new RuntimeException("편집자를 할당할 권한이 없습니다");
        }
        
        User editor = getUserOrCreate(editorEmail, "Editor User");
        
        // 기존 편집자 역할이 있다면 제거
        documentRoleRepository.findByDocumentAndRole(documentId, DocumentRole.TaskRole.EDITOR)
                .ifPresent(existingRole -> documentRoleRepository.delete(existingRole));
        
        // 새로운 편집자 역할 할당
        DocumentRole editorRole = DocumentRole.builder()
                .document(document)
                .assignedUser(editor)
                .taskRole(DocumentRole.TaskRole.EDITOR)
                .build();
        
        documentRoleRepository.save(editorRole);
        
        // 작업 로그 추가
        TasksLog editorTask = TasksLog.builder()
                .document(document)
                .assignedBy(assignedBy)
                .assignedUser(editor)
                .status(TasksLog.TaskStatus.PENDING)
                .build();
        
        tasksLogRepository.save(editorTask);
        
        // 문서 상태를 EDITING으로 변경
        document.setStatus(Document.DocumentStatus.EDITING);
        document = documentRepository.save(document);
        
        return document;
    }
    
    public Document assignReviewer(Long documentId, String reviewerEmail, User assignedBy) {
        log.info("검토자 할당 요청 - 문서 ID: {}, 검토자 이메일: {}, 요청자: {}", 
                documentId, reviewerEmail, assignedBy.getEmail());
        
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        log.info("문서 정보 - ID: {}, 상태: {}, 생성자: {}", 
                document.getId(), document.getStatus(), document.getTemplate().getCreatedBy().getEmail());
        
        // 생성자 또는 편집자만 검토자 할당 가능
        boolean isCreator = isCreator(document, assignedBy);
        boolean isEditor = isEditor(document, assignedBy);
        
        log.info("권한 확인 - 요청자: {}, 생성자 여부: {}, 편집자 여부: {}", 
                assignedBy.getEmail(), isCreator, isEditor);
        
        if (!isCreator && !isEditor) {
            throw new RuntimeException("검토자를 할당할 권한이 없습니다. 생성자 또는 편집자만 가능합니다.");
        }
        
        User reviewer = getUserOrCreate(reviewerEmail, "Reviewer User");
        
        // 기존 검토자 역할이 있다면 제거
        documentRoleRepository.findByDocumentAndRole(documentId, DocumentRole.TaskRole.REVIEWER)
                .ifPresent(existingRole -> documentRoleRepository.delete(existingRole));
        
        // 새로운 검토자 역할 할당
        DocumentRole reviewerRole = DocumentRole.builder()
                .document(document)
                .assignedUser(reviewer)
                .taskRole(DocumentRole.TaskRole.REVIEWER)
                .build();
        
        documentRoleRepository.save(reviewerRole);
        
        // 작업 로그 추가
        TasksLog reviewerTask = TasksLog.builder()
                .document(document)
                .assignedBy(assignedBy)
                .assignedUser(reviewer)
                .status(TasksLog.TaskStatus.PENDING)
                .build();
        
        tasksLogRepository.save(reviewerTask);
        
        return document;
    }
    
    @Transactional(readOnly = true)
    public List<Document> getDocumentsByUser(User user) {
        return documentRepository.findDocumentsByUserId(user.getId());
    }
    
    @Transactional(readOnly = true)
    public Optional<Document> getDocumentById(Long id) {
        return documentRepository.findById(id);
    }
    
    private boolean isCreator(Document document, User user) {
        return documentRoleRepository.findByDocumentAndUserAndRole(
                document.getId(), user.getId(), DocumentRole.TaskRole.CREATOR
        ).isPresent();
    }
    
    private boolean isEditor(Document document, User user) {
        return documentRoleRepository.findByDocumentAndUserAndRole(
                document.getId(), user.getId(), DocumentRole.TaskRole.EDITOR
        ).isPresent();
    }
    
    private boolean isReviewer(Document document, User user) {
        return documentRoleRepository.findByDocumentAndUserAndRole(
                document.getId(), user.getId(), DocumentRole.TaskRole.REVIEWER
        ).isPresent();
    }
    
    private User getUserOrCreate(String email, String defaultName) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .name(defaultName)
                            .email(email)
                            .password(passwordEncoder.encode("defaultPassword123"))
                            .position(User.Position.교직원)
                            .role(User.Role.USER)
                            .build();
                    return userRepository.save(newUser);
                });
    }
    
    public Document completeEditing(Long documentId, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 편집자 또는 생성자만 편집 완료 가능
        if (!isEditor(document, user) && !isCreator(document, user)) {
            throw new RuntimeException("편집을 완료할 권한이 없습니다");
        }
        
        // 현재 상태가 EDITING이어야 함
        if (document.getStatus() != Document.DocumentStatus.EDITING) {
            throw new RuntimeException("문서가 편집 상태가 아닙니다");
        }
        
        // 상태를 READY_FOR_REVIEW로 변경
        document.setStatus(Document.DocumentStatus.READY_FOR_REVIEW);
        document = documentRepository.save(document);
        
        // 작업 로그 추가
        TasksLog completeLog = TasksLog.builder()
                .document(document)
                .assignedBy(user)
                .assignedUser(user)
                .status(TasksLog.TaskStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .build();
        
        tasksLogRepository.save(completeLog);
        
        return document;
    }
    
    public Document approveDocument(Long documentId, User user, String signatureData) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 검토자만 승인 가능
        if (!isReviewer(document, user)) {
            throw new RuntimeException("문서를 승인할 권한이 없습니다");
        }
        
        // 현재 상태가 READY_FOR_REVIEW이어야 함
        if (document.getStatus() != Document.DocumentStatus.READY_FOR_REVIEW) {
            throw new RuntimeException("문서가 검토 대기 상태가 아닙니다");
        }
        
        // 서명 데이터를 문서 데이터에 추가
        if (signatureData != null && document.getData() != null) {
            ObjectNode data = (ObjectNode) document.getData();
            ObjectNode signatures = data.has("signatures") ? 
                    (ObjectNode) data.get("signatures") : objectMapper.createObjectNode();
            signatures.put(user.getEmail(), signatureData);
            data.set("signatures", signatures);
            document.setData(data);
        }
        
        // 상태를 COMPLETED로 변경
        document.setStatus(Document.DocumentStatus.COMPLETED);
        document = documentRepository.save(document);
        
        // 작업 로그 추가
        TasksLog approveLog = TasksLog.builder()
                .document(document)
                .assignedBy(user)
                .assignedUser(user)
                .status(TasksLog.TaskStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .build();
        
        tasksLogRepository.save(approveLog);
        
        return document;
    }
    
    public Document rejectDocument(Long documentId, User user, String reason) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        
        // 검토자만 거부 가능
        if (!isReviewer(document, user)) {
            throw new RuntimeException("문서를 거부할 권한이 없습니다");
        }
        
        // 현재 상태가 READY_FOR_REVIEW이어야 함
        if (document.getStatus() != Document.DocumentStatus.READY_FOR_REVIEW) {
            throw new RuntimeException("문서가 검토 대기 상태가 아닙니다");
        }
        
        // 상태를 REJECTED로 변경
        document.setStatus(Document.DocumentStatus.REJECTED);
        document = documentRepository.save(document);
        
        // 작업 로그 추가
        TasksLog rejectLog = TasksLog.builder()
                .document(document)
                .assignedBy(user)
                .assignedUser(user)
                .status(TasksLog.TaskStatus.REJECTED)
                .rejectionReason(reason)
                .completedAt(LocalDateTime.now())
                .build();
        
        tasksLogRepository.save(rejectLog);
        
        return document;
    }
    
    public boolean canReview(Long documentId, User user) {
        try {
            Document document = getDocumentById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document not found"));
            
            // 검토자이고 문서가 검토 대기 상태인지 확인
            return isReviewer(document, user) && 
                   document.getStatus() == Document.DocumentStatus.READY_FOR_REVIEW;
        } catch (Exception e) {
            log.error("Error checking review permission for document {} and user {}", documentId, user.getEmail(), e);
            return false;
        }
    }
} 